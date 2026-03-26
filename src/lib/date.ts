type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

export function formatRelativeTime(isoDate: string, t: TranslateFn): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return t('newTracks.today');
  if (diffDays === 1) return t('newTracks.yesterday');
  if (diffDays < 7) return t('newTracks.daysAgo', { count: diffDays });
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return t('newTracks.weeksAgo', { count: diffWeeks });
  return t('newTracks.monthAgo');
}
