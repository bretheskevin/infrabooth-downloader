import {
  commands,
  type Result,
  type DownloadRequest,
  type StartQueueRequest,
  type PlaylistInfo,
  type TrackInfo,
  type ValidationResult,
  type ErrorResponse,
  type SearchResponse,
  type PlaybackItem as BindingsPlaybackItem,
  type PlayerStateSnapshot,
} from '@/bindings';
import type { LibraryPlaylist } from '@/bindings';

type StringError = string;
type AnyError = ErrorResponse | StringError;

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

function unwrap<T>(result: Result<T, AnyError>): T {
  if (result.status === 'error') {
    const err = result.error;
    if (typeof err === 'string') {
      throw new ApiError('UNKNOWN', err);
    }
    throw new ApiError(err.code, err.message);
  }
  return result.data;
}

export const api = {
  // Auth
  checkAuth: (): Promise<boolean> =>
    commands.checkAuth().then(unwrap),

  refreshAuth: (): Promise<boolean> =>
    commands.refreshAuth().then(unwrap),

  signOut: (): Promise<void> =>
    commands.signOut().then(unwrap).then(() => undefined),

  // Media info
  getPlaylistInfo: (url: string): Promise<PlaylistInfo> =>
    commands.getPlaylistInfo(url).then(unwrap),

  getTrackInfo: (url: string): Promise<TrackInfo> =>
    commands.getTrackInfo(url).then(unwrap),

  // Validation (no Result wrapper - returns ValidationResult directly)
  validateSoundcloudUrl: (url: string): Promise<ValidationResult> =>
    commands.validateSoundcloudUrl(url),

  // Download
  downloadTrackFull: (request: DownloadRequest): Promise<string> =>
    commands.downloadTrackFull(request).then(unwrap),

  startDownloadQueue: (request: StartQueueRequest): Promise<void> =>
    commands.startDownloadQueue(request).then(unwrap).then(() => undefined),

  cancelDownloadQueue: (): Promise<void> =>
    commands.cancelDownloadQueue().then(unwrap).then(() => undefined),

  // Settings
  checkWritePermission: (path: string): Promise<boolean> =>
    commands.checkWritePermission(path).then(unwrap),

  getDefaultDownloadPath: (): Promise<string> =>
    commands.getDefaultDownloadPath().then(unwrap),

  validateDownloadPath: (path: string): Promise<boolean> =>
    commands.validateDownloadPath(path).then(unwrap),

  // Testing/Debug
  testFfmpeg: (): Promise<string> =>
    commands.testFfmpeg().then(unwrap),

  // Library
  getLibraryPlaylists: (): Promise<LibraryPlaylist[]> =>
    commands.getLibraryPlaylists().then(unwrap),

  clearLibraryCache: (): Promise<void> =>
    commands.clearLibraryCache().then(unwrap).then(() => undefined),

  resolveLibraryArtwork: (playlistId: number, secretToken: string | null): Promise<string | null> =>
    commands.resolveLibraryArtwork(playlistId, secretToken).then(unwrap),

  getLibraryPlaylistTracks: (playlistId: number): Promise<TrackInfo[]> =>
    commands.getLibraryPlaylistTracks(playlistId).then(unwrap),

  // Search
  searchTracks: (query: string, limit: number, offset: number): Promise<SearchResponse> =>
    commands.searchTracks(query, limit, offset).then(unwrap),

  // Player
  playerPlayAt: (queue: BindingsPlaybackItem[], index: number): Promise<void> =>
    commands.playerPlayAt(queue, index).then(unwrap).then(() => undefined),

  playerPause: (): Promise<void> =>
    commands.playerPause().then(unwrap).then(() => undefined),

  playerResume: (): Promise<void> =>
    commands.playerResume().then(unwrap).then(() => undefined),

  playerSeek: (positionMs: number): Promise<void> =>
    commands.playerSeek(positionMs).then(unwrap).then(() => undefined),

  playerSetVolume: (volume: number): Promise<void> =>
    commands.playerSetVolume(volume).then(unwrap).then(() => undefined),

  playerNext: (): Promise<void> =>
    commands.playerNext().then(unwrap).then(() => undefined),

  playerPrevious: (): Promise<void> =>
    commands.playerPrevious().then(unwrap).then(() => undefined),

  playerStop: (): Promise<void> =>
    commands.playerStop().then(unwrap).then(() => undefined),

  playerGetState: (): Promise<PlayerStateSnapshot> =>
    commands.playerGetState().then(unwrap),

  playerReorderQueue: (fromIndex: number, toIndex: number): Promise<void> =>
    commands.playerReorderQueue(fromIndex, toIndex).then(unwrap).then(() => undefined),

  playerRemoveFromQueue: (index: number): Promise<void> =>
    commands.playerRemoveFromQueue(index).then(unwrap).then(() => undefined),
};
