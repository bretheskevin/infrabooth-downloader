import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkWritePermission, getDefaultDownloadPath } from './settings';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkWritePermission', () => {
    it('invokes check_write_permission with path', async () => {
      vi.mocked(invoke).mockResolvedValue(true);

      await checkWritePermission('/Users/test/Downloads');

      expect(invoke).toHaveBeenCalledWith('check_write_permission', {
        path: '/Users/test/Downloads',
      });
    });

    it('returns true for writable directory', async () => {
      vi.mocked(invoke).mockResolvedValue(true);

      const result = await checkWritePermission('/writable/path');

      expect(result).toBe(true);
    });

    it('returns false for non-writable directory', async () => {
      vi.mocked(invoke).mockResolvedValue(false);

      const result = await checkWritePermission('/readonly/path');

      expect(result).toBe(false);
    });

    it('throws error for non-existent path', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Directory does not exist'));

      await expect(checkWritePermission('/nonexistent')).rejects.toThrow('Directory does not exist');
    });
  });

  describe('getDefaultDownloadPath', () => {
    it('invokes get_default_download_path', async () => {
      vi.mocked(invoke).mockResolvedValue('/Users/test/Downloads');

      await getDefaultDownloadPath();

      expect(invoke).toHaveBeenCalledWith('get_default_download_path');
    });

    it('returns the default downloads path', async () => {
      vi.mocked(invoke).mockResolvedValue('/Users/test/Downloads');

      const result = await getDefaultDownloadPath();

      expect(result).toBe('/Users/test/Downloads');
    });
  });
});
