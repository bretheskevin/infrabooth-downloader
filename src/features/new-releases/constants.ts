export type ReleaseFilter = 'all' | 'albums' | 'playlists';

export const RELEASE_TYPE_KEYS: Record<import('@/bindings').ReleaseType, string> = {
  Album: 'newReleases.typeAlbum',
  EP: 'newReleases.typeEP',
  Single: 'newReleases.typeSingle',
  Compilation: 'newReleases.typeCompilation',
  Playlist: 'newReleases.typePlaylist',
};
