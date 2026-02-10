import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { logger } from './logger';

/**
 * Opens the download folder in the system file browser.
 * Uses the Tauri opener plugin's revealItemInDir which handles cross-platform revealing:
 * - macOS: Opens Finder with the folder selected
 * - Windows: Opens Explorer with the folder selected
 * - Linux: Opens file manager with the folder selected
 *
 * @param path - The folder path to reveal
 * @throws Error if the folder cannot be revealed
 */
export async function openDownloadFolder(path: string): Promise<void> {
  logger.info(`[shellCommands] Opening folder: ${path}`);
  try {
    await revealItemInDir(path);
    logger.info(`[shellCommands] Folder opened successfully`);
  } catch (error) {
    logger.error(`[shellCommands] Failed to open folder: ${error}`);
    throw new Error('Could not open folder');
  }
}
