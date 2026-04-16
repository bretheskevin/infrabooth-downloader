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
  type ArtistProfile,
  type UserSearchResponse,
  type ReleaseActivityItem,
  type SortOption,
  type ArtistPlaylist,
  type ExportResult,
  type ExportTrackRequest,
  type RekordboxPlaylistInfo,
  type RekordboxStatus,
  type UnreadCountResult,
  type NotificationsPage,
} from '@/bindings';
import type { LibraryPlaylist } from '@/bindings';
import { useSettingsStore } from '@/features/settings/store';

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

function getStoredRekordboxPathOverride(): string | null {
  return useSettingsStore.getState().rekordboxPathOverride || null;
}

export const api = {
  // Auth
  checkAuth: (): Promise<boolean> =>
    commands.checkAuth().then(unwrap),

  refreshAuth: (): Promise<boolean> =>
    commands.refreshAuth().then(unwrap),

  signOut: (): Promise<void> =>
    commands.signOut().then(unwrap).then(() => undefined),

  checkFirefoxInstalled: (): Promise<boolean> =>
    commands.checkFirefoxInstalled(),

  openInFirefox: (): Promise<void> =>
    commands.openInFirefox().then(unwrap).then(() => undefined),

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

  getAppDataPath: (): Promise<string> =>
    commands.getAppDataPath().then(unwrap),

  getLogPath: (): Promise<string> =>
    commands.getLogPath().then(unwrap),

  validateDownloadPath: (path: string): Promise<boolean> =>
    commands.validateDownloadPath(path).then(unwrap),

  detectRekordbox: (manualDbPath?: string): Promise<RekordboxStatus> =>
    commands.detectRekordbox(manualDbPath ?? null).then(unwrap),

  getDefaultRekordboxDataDirectoryParent: (): Promise<string> =>
    commands.getDefaultRekordboxDataDirectoryParent().then(unwrap),

  exportToRekordbox: (tracks: ExportTrackRequest[], playlistName: string | null): Promise<ExportResult> =>
    commands.exportToRekordbox(tracks, playlistName, getStoredRekordboxPathOverride()).then(unwrap),

  listRekordboxPlaylists: (): Promise<RekordboxPlaylistInfo[]> =>
    commands.listRekordboxPlaylists(getStoredRekordboxPathOverride()).then(unwrap),

  deleteRekordboxPlaylist: (playlistId: string): Promise<void> =>
    commands.deleteRekordboxPlaylist(playlistId, getStoredRekordboxPathOverride()).then(unwrap).then(() => undefined),

  restoreRekordboxBackup: (backupPath: string): Promise<void> =>
    commands.restoreRekordboxBackup(backupPath, getStoredRekordboxPathOverride()).then(unwrap).then(() => undefined),

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

  searchUsers: (query: string, limit: number, offset: number): Promise<UserSearchResponse> =>
    commands.searchUsers(query, limit, offset).then(unwrap),

  // Player
  resolvePlaybackUrl: (trackId: number, trackUrl: string): Promise<string> =>
    commands.resolvePlaybackUrl(trackId, trackUrl).then(unwrap),

  fetchRelatedTracks: (trackId: number, limit: number): Promise<TrackInfo[]> =>
    commands.fetchRelatedTracks(trackId, limit).then(unwrap),

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

  getArtistProfile: (artistId: number): Promise<ArtistProfile> =>
    commands.getArtistProfile(artistId).then(unwrap),

  getAllArtistTracks: (artistId: number, sort: SortOption): Promise<TrackInfo[]> =>
    commands.getAllArtistTracks(artistId, sort).then(unwrap),

  getArtistPlaylists: (artistId: number): Promise<ArtistPlaylist[]> =>
    commands.getArtistPlaylists(artistId).then(unwrap),

  getArtistPlaylistTracks: (playlistId: number): Promise<TrackInfo[]> =>
    commands.getArtistPlaylistTracks(playlistId).then(unwrap),

  getArtistReleases: (artistId: number): Promise<ReleaseActivityItem[]> =>
    commands.getArtistReleases(artistId).then(unwrap),

  getReleaseTracks: (releaseId: number): Promise<TrackInfo[]> =>
    commands.getReleaseTracks(releaseId).then(unwrap),

  markArtistReleasesSeen: (artistId: number): Promise<void> =>
    commands.markArtistReleasesSeen(artistId).then(() => undefined),

  // Follow
  followUser: (userId: number): Promise<void> =>
    commands.followUser(userId).then(unwrap).then(() => undefined),

  unfollowUser: (userId: number): Promise<void> =>
    commands.unfollowUser(userId).then(unwrap).then(() => undefined),

  checkFollowStatus: (userId: number): Promise<boolean> =>
    commands.checkFollowStatus(userId).then(unwrap),

  // Notifications
  getUnreadCount: (): Promise<UnreadCountResult> =>
    commands.getUnreadCount().then(unwrap),

  getNotificationsPage: (cursor: string | null): Promise<NotificationsPage> =>
    commands.getNotificationsPage(cursor).then(unwrap),

  markNotificationsSeen: (latestCreatedAt: string): Promise<void> =>
    commands.markNotificationsSeen(latestCreatedAt).then(unwrap).then(() => undefined),
};
