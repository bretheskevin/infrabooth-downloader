import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window';
import { logger } from '@/lib/logger';
import { getErrorString } from '@/lib/utils';

export async function requestAttentionIfUnfocused(): Promise<void> {
  try {
    const appWindow = getCurrentWindow();
    if (await appWindow.isFocused()) {
      void logger.debug('[queue-attention] Queue finished while focused; skipping Dock bounce');
      return;
    }
    await appWindow.requestUserAttention(UserAttentionType.Informational);
    void logger.info('[queue-attention] Queue finished while unfocused; requested informational user attention');
  } catch (error) {
    void logger.warn(`[queue-attention] Could not request user attention: ${getErrorString(error)}`);
  }
}
