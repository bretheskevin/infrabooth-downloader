import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { logger } from '@/lib/logger';

export async function copyToClipboard(text: string, context: string): Promise<boolean> {
  try {
    await writeText(text);
    void logger.info(`[${context}] Copied ${text.length} chars to clipboard`);
    return true;
  } catch (error) {
    void logger.error(`[${context}] Clipboard write failed: ${String(error)}`);
    return false;
  }
}
