import { open } from '@tauri-apps/plugin-dialog';

export interface FolderDialogOptions {
  defaultPath?: string;
  title?: string;
}

/**
 * Opens a native OS folder selection dialog.
 * @returns The selected folder path, or null if cancelled.
 */
export async function selectFolder(options: FolderDialogOptions = {}): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: options.defaultPath,
    title: options.title || 'Select Folder',
  });

  // Returns string (path) or null (cancelled)
  return selected as string | null;
}
