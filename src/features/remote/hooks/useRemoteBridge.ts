import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { commands } from '@/bindings';
import { logger } from '@/lib/logger';
import { usePlayerStore } from '@/features/player/store';
import { useSettingsStore, type Theme } from '@/features/settings/store';
import { useRemoteStore } from '../store';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
    case 'downloadTrack': {
      const outputDir = useSettingsStore.getState().downloadPath || null;
      const { trackId } = cmd.track;
      useRemoteStore.getState().markDownloading(trackId);
      void commands
        .downloadTrackFull({
          trackId: String(trackId),
          trackUrl: cmd.track.trackUrl,
          title: cmd.track.title,
          artist: cmd.track.artist,
          artworkUrl: cmd.track.artworkUrl,
          durationMs: cmd.track.durationMs,
          downloadUrl: null,
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
          }
        })
        .catch((e) => void logger.error(`[remote] Download failed: ${e}`))
        .finally(() => useRemoteStore.getState().clearDownloading(trackId));
      break;
    }
  }
}

export function buildRemoteState(): RemoteState {
  const { state, currentTrack, positionMs, durationMs, volume, queue, cursor } = usePlayerStore.getState();
  const { language, theme } = useSettingsStore.getState();
  const { downloadingTrackIds, downloadedTrackIds } = useRemoteStore.getState();
  return {
    state,
    currentTrack,
    positionMs,
    durationMs,
    volume,
    queue,
    cursor,
    language,
    theme: resolveTheme(theme),
    downloadingTrackIds,
    downloadedTrackIds,
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
    prev.cursor === next.cursor
  );
}

export function useRemoteBridge(): void {
  const serverInfo = useRemoteStore((s) => s.serverInfo);
  const remoteControlEnabled = useSettingsStore((s) => s.remoteControlEnabled);
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
    if (!serverInfo) return;

    pushState();

    let unlisten: (() => void) | null = null;
    listen<string>('remote-command', (event) => {
      try {
        const cmd = JSON.parse(event.payload) as RemoteCommand;
        dispatchCommand(cmd);
      } catch (e) {
        void logger.error(`[remote] Failed to parse command: ${e}`);
      }
    }).then((fn) => {
      unlisten = fn;
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

    const unsubscribeRemote = useRemoteStore.subscribe((next, prev) => {
      if (next.downloadingTrackIds !== prev.downloadingTrackIds || next.downloadedTrackIds !== prev.downloadedTrackIds) {
        pushState();
      }
    });

    const unsubscribeSettings = useSettingsStore.subscribe((next, prev) => {
      if (next.language !== prev.language || next.theme !== prev.theme) pushState();
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (useSettingsStore.getState().theme === 'system') pushState();
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      unlisten?.();
      unsubscribe();
      unsubscribeRemote();
      unsubscribeSettings();
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [serverInfo]);
}
