import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openDownloadFolder } from './shellCommands';

// Mock the Tauri opener plugin
vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir: vi.fn(),
}));

import { revealItemInDir } from '@tauri-apps/plugin-opener';

describe('shellCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('openDownloadFolder', () => {
    it('should call revealItemInDir with the provided path', async () => {
      const mockReveal = vi.mocked(revealItemInDir);
      mockReveal.mockResolvedValueOnce(undefined);

      await openDownloadFolder('/Users/test/Downloads');

      expect(mockReveal).toHaveBeenCalledWith('/Users/test/Downloads');
    });

    it('should throw error when revealItemInDir fails', async () => {
      const mockReveal = vi.mocked(revealItemInDir);
      mockReveal.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(openDownloadFolder('/Users/test/Downloads')).rejects.toThrow(
        'Could not open folder'
      );
    });

    it('should handle empty path gracefully', async () => {
      const mockReveal = vi.mocked(revealItemInDir);
      mockReveal.mockResolvedValueOnce(undefined);

      await openDownloadFolder('');

      expect(mockReveal).toHaveBeenCalledWith('');
    });

    it('should handle paths with spaces', async () => {
      const mockReveal = vi.mocked(revealItemInDir);
      mockReveal.mockResolvedValueOnce(undefined);

      await openDownloadFolder('/Users/test/My Downloads/Music');

      expect(mockReveal).toHaveBeenCalledWith('/Users/test/My Downloads/Music');
    });
  });
});
