import type { CommentThread } from '../types';
import { CommentRow } from './CommentRow';

interface CommentThreadRowProps {
  thread: CommentThread;
}

export function CommentThreadRow({ thread }: CommentThreadRowProps) {
  return (
    <div className="border-b border-border/30 last:border-0">
      <CommentRow comment={thread.root} showTimestamp />
      {thread.replies.map((reply) => (
        <CommentRow key={reply.id} comment={reply} isReply />
      ))}
    </div>
  );
}
