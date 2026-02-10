import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openDownloadFolder } from './shellCommands';

// Mock the Tauri shell plugin
vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

import { open } from '@tauri-apps/plugin-shell';

describe('shellCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('openDownloadFolder', () => {
    it('should call open with the provided path', async () => {
      const mockOpen = vi.mocked(open);
      mockOpen.mockResolvedValueOnce(undefined);

      await openDownloadFolder('/Users/test/Downloads');

      expect(mockOpen).toHaveBeenCalledWith('/Users/test/Downloads');
    });

    it('should throw error when open fails', async () => {
      const mockOpen = vi.mocked(open);
      mockOpen.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(openDownloadFolder('/Users/test/Downloads')).rejects.toThrow(
        'Could not open folder'
      );
    });

    it('should handle empty path gracefully', async () => {
      const mockOpen = vi.mocked(open);
      mockOpen.mockResolvedValueOnce(undefined);

      await openDownloadFolder('');

      expect(mockOpen).toHaveBeenCalledWith('');
    });

    it('should handle paths with spaces', async () => {
      const mockOpen = vi.mocked(open);
      mockOpen.mockResolvedValueOnce(undefined);

      await openDownloadFolder('/Users/test/My Downloads/Music');

      expect(mockOpen).toHaveBeenCalledWith('/Users/test/My Downloads/Music');
    });
  });
});
