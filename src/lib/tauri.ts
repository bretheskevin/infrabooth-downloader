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
  type PlaylistForTrackPicker,
  type Selection,
  type FollowedArtist,
  type ActivityItem,
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

  addTrackToPlaylist: (playlistId: number, trackId: number): Promise<void> =>
    commands.addTrackToPlaylist(playlistId, trackId).then(unwrap).then(() => undefined),

  removeTrackFromPlaylist: (playlistId: number, trackId: number): Promise<void> =>
    commands.removeTrackFromPlaylist(playlistId, trackId).then(unwrap).then(() => undefined),

  getOwnedPlaylistsForTrack: (trackId: number): Promise<PlaylistForTrackPicker[]> =>
    commands.getOwnedPlaylistsForTrack(trackId).then(unwrap),

  // Search
  searchTracks: (query: string, limit: number, offset: number): Promise<SearchResponse> =>
    commands.searchTracks(query, limit, offset).then(unwrap),

  // Player
  resolvePlaybackUrl: (trackId: number, trackUrl: string): Promise<string> =>
    commands.resolvePlaybackUrl(trackId, trackUrl).then(unwrap),

  // Selections
  getSelections: (): Promise<Selection[]> =>
    commands.getSelections().then(unwrap),

  // New Tracks
  getFollowedArtists: (forceRefresh = false): Promise<FollowedArtist[]> =>
    commands.getFollowedArtists(forceRefresh).then(unwrap),

  getArtistActivity: (artistId: number): Promise<ActivityItem[]> =>
    commands.getArtistActivity(artistId).then(unwrap),

  markArtistSeen: (artistId: number): Promise<void> =>
    commands.markArtistSeen(artistId).then(() => undefined),
};
