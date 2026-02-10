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

/**
 * Validates if a path exists and is a directory.
 * Unlike checkWritePermission, this only checks existence, not write access.
 * @param path The directory path to validate
 * @returns true if path exists and is a directory, false otherwise
 */
export async function validateDownloadPath(path: string): Promise<boolean> {
  try {
    return await invoke<boolean>('validate_download_path', { path });
  } catch (error) {
    console.error('Failed to validate download path:', error);
    return false;
  }
}
