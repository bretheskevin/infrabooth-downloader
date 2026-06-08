import type { TrackComment } from '@/bindings';
import type { CommentThread } from '../types';

export function buildCommentThreads(comments: TrackComment[]): CommentThread[] {
  const groupMap = new Map<number, TrackComment[]>();
  const order: Array<{ standalone: TrackComment } | { key: number }> = [];

  for (const comment of comments) {
    if (comment.timestampMs === 0) {
      order.push({ standalone: comment });
      continue;
    }
    const key = comment.timestampMs;
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(comment);
    } else {
      groupMap.set(key, [comment]);
      order.push({ key });
    }
  }

  return order.map((entry) => {
    if ('standalone' in entry) {
      return { root: entry.standalone, replies: [] };
    }
    const group = groupMap.get(entry.key)!;
    const sorted = [...group].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { root: sorted[0]!, replies: sorted.slice(1) };
  });
}
