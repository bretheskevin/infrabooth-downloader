import { useQueryClient } from '@tanstack/react-query';
import type { ConversationMessage } from '@/bindings';
import { usePlayerStore } from '@/features/player';
import { buildConversationQueue } from '../utils/conversationQueue';

export function useConversationQueue(items: ConversationMessage[]) {
  const queryClient = useQueryClient();

  const playFromIndex = (clickedIndex: number) => {
    const queue = buildConversationQueue(items, clickedIndex, queryClient);
    if (queue.length === 0) return;
    void usePlayerStore.getState().play(queue, 0);
  };

  return playFromIndex;
}
