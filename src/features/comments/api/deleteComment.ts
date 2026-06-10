import { api } from '@/lib/tauri';

export function deleteComment(trackId: number, commentId: number) {
  return api.deleteComment(trackId, commentId);
}
