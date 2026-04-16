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

export function formatChatTimestamp(isoDate: string, locale: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (seconds < 60) return rtf.format(-seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, 'day');
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return rtf.format(-weeks, 'week');
  const months = Math.floor(days / 30);
  return rtf.format(-months, 'month');
}
