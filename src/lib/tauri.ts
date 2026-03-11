import {
  commands,
  type Result,
  type DownloadRequest,
  type StartQueueRequest,
  type PlaylistInfo,
  type TrackInfo,
  type ValidationResult,
  type ErrorResponse,
} from '@/bindings';
import type { LibraryPlaylist } from '@/bindings';

type StringError = string;
type AnyError = ErrorResponse | StringError;

function getErrorMessage(error: AnyError): string {
  if (typeof error === 'string') {
    return error;
  }
  return error.message;
}

function unwrap<T>(result: Result<T, AnyError>): T {
  if (result.status === 'error') {
    throw new Error(getErrorMessage(result.error));
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
};
