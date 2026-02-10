import { invoke } from '@tauri-apps/api/core';

/**
 * Checks if the application has write permission to the specified directory.
 * Uses Tauri backend to verify by attempting to create/delete a temp file.
 * @param path The directory path to check
 * @returns true if writable, false if not writable
 * @throws Error if path doesn't exist or is not a directory
 */
export async function checkWritePermission(path: string): Promise<boolean> {
  return invoke<boolean>('check_write_permission', { path });
}

/**
 * Gets the system's default downloads directory.
 * @returns The path to the user's Downloads folder
 */
export async function getDefaultDownloadPath(): Promise<string> {
  return invoke<string>('get_default_download_path');
}
