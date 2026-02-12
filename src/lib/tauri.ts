import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
  options?: { silent?: boolean }
): Promise<T> {
  if (!options?.silent) {
    logger.debug(`[tauri] Invoking ${command}`);
  }
  try {
    const result = await invoke<T>(command, args);
    if (!options?.silent) {
      logger.debug(`[tauri] ${command} completed`);
    }
    return result;
  } catch (error) {
    logger.error(`[tauri] ${command} failed: ${error}`);
    throw error;
  }
}
