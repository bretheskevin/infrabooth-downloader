type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

export function formatRelativeTime(isoDate: string, t: TranslateFn): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return t('common.today');
  if (diffDays === 1) return t('common.yesterday');
  if (diffDays < 7) return t('common.daysAgo', { count: diffDays });
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return t('common.weeksAgo', { count: diffWeeks });
  return t('common.monthAgo');
}
