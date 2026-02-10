import { open } from '@tauri-apps/plugin-shell';

/**
 * Opens the download folder in the system file browser.
 * Uses the Tauri shell plugin which handles cross-platform opening:
 * - macOS: Uses 'open' command -> opens Finder
 * - Windows: Uses 'start' command -> opens Explorer
 * - Linux: Uses 'xdg-open' -> opens file manager
 *
 * @param path - The folder path to open
 * @throws Error if the folder cannot be opened
 */
export async function openDownloadFolder(path: string): Promise<void> {
  try {
    await open(path);
  } catch (error) {
    console.error('Failed to open folder:', error);
    throw new Error('Could not open folder');
  }
}
