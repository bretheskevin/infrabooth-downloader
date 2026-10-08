import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { commands } from '@/bindings';
import { logger } from '@/lib/logger';
import { applyDownloadEvent, useDownloadStateStore } from '@/hooks/useDownloadState';
import { usePlayerStore } from '@/features/player/store';
import { useSettingsStore, type Theme } from '@/features/settings/store';
import { useRemoteStore } from '../store';
import { useLocalApiActive } from './useLocalApiActive';
import { useAuthStore } from '@/features/auth/store';
import { useQueueStore } from '@/features/queue/store';
import { isDownloadQueueBusy } from '@/features/queue/utils/queueBusy';
import { startPlaylistDownload } from '@/features/queue/utils/startPlaylistDownload';
import { trackInfoToQueueTrack } from '@/features/queue/utils/transforms';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type DownloadTrackCommand = Extract<RemoteCommand, { type: 'downloadTrack' }>;
type DownloadPlaylistCommand = Extract<RemoteCommand, { type: 'downloadPlaylist' }>;

function markTrackRowFailed(trackId: string, message: string): void {
  if (useDownloadStateStore.getState().states.get(trackId)?.status !== 'downloading') return;
  applyDownloadEvent({
    trackId,
    status: 'failed',
    percent: null,
    downloadedBytes: null,
    totalBytes: null,
    error: { code: 'DOWNLOAD_ERROR', message },
  });
}

function downloadRemoteTrack({ track, outputDir: outputDirOverride, secretToken, downloadUrl }: DownloadTrackCommand): void {
  const outputDir = outputDirOverride || useSettingsStore.getState().downloadPath || null;
  const { trackId } = track;
  void logger.info(
    `[remote] downloadTrack ${trackId} "${track.title}" outputDir=${outputDir ?? '<system default>'} (override=${outputDirOverride ?? 'none'}), secretToken=${secretToken ? 'yes' : 'no'}, downloadUrl=${downloadUrl ? 'yes' : 'no'}`,
  );
  const rowId = String(trackId);
  useRemoteStore.getState().markDownloading(trackId);
  applyDownloadEvent({ trackId: rowId, status: 'downloading', percent: 0, downloadedBytes: null, totalBytes: null, error: null });
  void commands
    .downloadTrackFull({
      trackId: rowId,
      trackUrl: track.trackUrl,
      title: track.title,
      artist: track.artist,
      artworkUrl: track.artworkUrl,
      durationMs: track.durationMs,
      downloadUrl: downloadUrl ?? null,
      secretToken: secretToken ?? null,
      album: null,
      trackNumber: null,
      totalTracks: null,
      outputDir,
    })
    .then((result) => {
      if (result.status === 'ok') {
        useRemoteStore.getState().markDownloaded(trackId);
      } else {
        void logger.error(`[remote] Download failed: ${result.error.message}`);
        markTrackRowFailed(rowId, result.error.message);
      }
    })
    .catch((e) => {
      void logger.error(`[remote] Download failed: ${e}`);
      markTrackRowFailed(rowId, String(e));
    })
    .finally(() => useRemoteStore.getState().clearDownloading(trackId));
}

function downloadRemotePlaylist({ title, tracks, outputDir }: DownloadPlaylistCommand): void {
  const queue = useQueueStore.getState();
  if (isDownloadQueueBusy(queue)) {
    void logger.warn(
      `[remote] downloadPlaylist "${title}" ignored: queue busy (processing=${queue.isProcessing}, cancelling=${queue.isCancelling}, complete=${queue.isComplete}, failed=${queue.failedCount})`,
    );
    return;
  }
  void logger.info(`[remote] downloadPlaylist "${title}": ${tracks.length} tracks, outputDir override=${outputDir ?? 'none'}`);
  void startPlaylistDownload(tracks.map(trackInfoToQueueTrack), title, outputDir);
}

export function dispatchCommand(cmd: RemoteCommand): void {
  const s = usePlayerStore.getState();
  switch (cmd.type) {
    case 'pause':
      s.pause();
      break;
    case 'resume':
      s.resume();
      break;
    case 'next':
      void s.next();
      break;
    case 'previous':
      void s.previous();
      break;
    case 'toggleShuffle':
      s.toggleShuffle();
      break;
    case 'seek':
      s.seek(cmd.positionMs);
      break;
    case 'setVolume':
      s.setVolume(cmd.volume);
      break;
    case 'skipTo':
      void s.skipTo(cmd.index);
      break;
    case 'removeFromQueue':
      s.removeFromQueue(cmd.index);
      break;
    case 'reorderQueue':
      s.reorderQueue(cmd.fromIndex, cmd.toIndex);
      break;
    case 'playTracks':
      void s.play(cmd.tracks, cmd.startIndex);
      break;
    case 'queueTrack':
      s.addToQueue(cmd.track);
      break;
    case 'queueTracks':
      cmd.tracks.forEach((track) => s.addToQueue(track));
      break;
    case 'downloadTrack':
      downloadRemoteTrack(cmd);
      break;
    case 'downloadPlaylist':
      downloadRemotePlaylist(cmd);
      break;
  }
}

export function buildRemoteState(): RemoteState {
  const { state, currentTrack, positionMs, durationMs, volume, queue, cursor, isShuffled, manualQueueCount, stationQueueCount } =
    usePlayerStore.getState();
  const { language, theme, downloadPath } = useSettingsStore.getState();
  const { downloadingTrackIds, downloadedTrackIds } = useRemoteStore.getState();
  const { isSignedIn } = useAuthStore.getState();
  return {
    state,
    currentTrack,
    positionMs,
    durationMs,
    volume,
    queue,
    cursor,
    shuffle: isShuffled,
    manualQueueCount,
    stationQueueCount,
    language,
    theme: resolveTheme(theme),
    downloadingTrackIds,
    downloadedTrackIds,
    isSignedIn,
    downloadPath,
    downloadQueueBusy: isDownloadQueueBusy(useQueueStore.getState()),
  };
}

function pushState(): void {
  void commands.pushRemoteState(JSON.stringify(buildRemoteState()));
}

function isPositionOnlyChange(prev: ReturnType<typeof usePlayerStore.getState>, next: ReturnType<typeof usePlayerStore.getState>): boolean {
  return (
    prev.state === next.state &&
    prev.currentTrack === next.currentTrack &&
    prev.durationMs === next.durationMs &&
    prev.volume === next.volume &&
    prev.queue === next.queue &&
    prev.cursor === next.cursor &&
    prev.isShuffled === next.isShuffled &&
    prev.manualQueueCount === next.manualQueueCount &&
    prev.stationQueueCount === next.stationQueueCount
  );
}

function subscribeToStoreChanges(): () => void {
  const unsubscribers = [
    useRemoteStore.subscribe((next, prev) => {
      if (next.downloadingTrackIds !== prev.downloadingTrackIds || next.downloadedTrackIds !== prev.downloadedTrackIds) pushState();
    }),
    useSettingsStore.subscribe((next, prev) => {
      if (next.language !== prev.language || next.theme !== prev.theme || next.downloadPath !== prev.downloadPath) pushState();
    }),
    useAuthStore.subscribe((next, prev) => {
      if (next.isSignedIn !== prev.isSignedIn) pushState();
    }),
    useQueueStore.subscribe((next, prev) => {
      if (isDownloadQueueBusy(next) !== isDownloadQueueBusy(prev)) pushState();
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function useRemoteBridge(): void {
  const serverInfo = useRemoteStore((s) => s.serverInfo);
  const remoteControlEnabled = useSettingsStore((s) => s.remoteControlEnabled);
  const localApiActive = useLocalApiActive();
  const active = serverInfo !== null || localApiActive;
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (remoteControlEnabled && !serverInfo && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true;
      useRemoteStore
        .getState()
        .enable()
        .catch(() => useSettingsStore.getState().setRemoteControlEnabled(false));
    }
  }, [remoteControlEnabled, serverInfo]);

  useEffect(() => {
    if (!active) return;

    void logger.info(`[remote] bridge active (phone remote running: ${useRemoteStore.getState().serverInfo !== null})`);
    pushState();

    const unlistenPromise = listen<string>('remote-command', (event) => {
      try {
        const cmd = JSON.parse(event.payload) as RemoteCommand;
        dispatchCommand(cmd);
      } catch (e) {
        void logger.error(`[remote] Failed to parse command: ${e}`);
      }
    });

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = usePlayerStore.subscribe((next, prev) => {
      if (isPositionOnlyChange(prev, next)) {
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            throttleTimer = null;
            pushState();
          }, 500);
        }
      } else {
        if (throttleTimer) {
          clearTimeout(throttleTimer);
          throttleTimer = null;
        }
        pushState();
      }
    });

    const unsubscribeStores = subscribeToStoreChanges();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (useSettingsStore.getState().theme === 'system') pushState();
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
      unsubscribe();
      unsubscribeStores();
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [active]);
}
