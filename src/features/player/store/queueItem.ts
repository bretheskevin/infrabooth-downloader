import type { PlaybackItem, QueueItem } from '../types';

let counter = 0;

export function withUid(item: PlaybackItem): QueueItem {
  counter += 1;
  return { ...item, uid: `q${counter}` };
}

export function withUids(items: PlaybackItem[]): QueueItem[] {
  return items.map(withUid);
}
