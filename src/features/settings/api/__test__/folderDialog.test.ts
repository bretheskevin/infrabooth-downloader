import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectFolder } from '../folderDialog';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

import { open } from '@tauri-apps/plugin-dialog';

describe('selectFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls open with directory: true', async () => {
    vi.mocked(open).mockResolvedValue('/path/to/folder');

    await selectFolder();

    expect(open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      defaultPath: undefined,
      title: 'Select Folder',
    });
  });

  it('passes defaultPath option', async () => {
    vi.mocked(open).mockResolvedValue('/path/to/folder');

    await selectFolder({ defaultPath: '/Users/test' });

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: '/Users/test',
      })
    );
  });

  it('passes custom title option', async () => {
    vi.mocked(open).mockResolvedValue('/path/to/folder');

    await selectFolder({ title: 'Choose Download Folder' });

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Choose Download Folder',
      })
    );
  });

  it('returns selected path as string', async () => {
    vi.mocked(open).mockResolvedValue('/Users/test/Downloads');

    const result = await selectFolder();

    expect(result).toBe('/Users/test/Downloads');
  });

  it('returns null when user cancels', async () => {
    vi.mocked(open).mockResolvedValue(null);

    const result = await selectFolder();

    expect(result).toBeNull();
  });
});
