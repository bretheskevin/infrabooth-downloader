export const STALE_TIME = 5 * 60 * 1000;
export const FOLLOWED_ARTISTS_KEY = ['followed-artists'] as const;

export type ActivityFilter = 'all' | 'new' | 'reposted';
