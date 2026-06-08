import type { TrackComment } from '@/bindings';

export interface CommentThread {
  root: TrackComment;
  replies: TrackComment[];
}
