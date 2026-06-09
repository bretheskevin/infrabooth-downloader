import { api } from '@/lib/tauri';

export function postComment(trackId: number, body: string, timestamp: number, replyToPermalink: string | null) {
  return api.postComment(trackId, body, timestamp, replyToPermalink);
}
