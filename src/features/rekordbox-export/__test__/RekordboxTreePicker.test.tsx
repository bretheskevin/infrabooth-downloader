import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { RekordboxTreeNode } from '@/bindings';
import { RekordboxTreePicker } from '../components/RekordboxTreePicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'rekordboxExport.rootFolder': 'Rekordbox (root)',
        'rekordboxExport.newPlaylistPreview': `Will be created: ${params?.name ?? ''}`,
        'rekordboxExport.existingPlaylistUpdate': 'Will be updated',
        'rekordboxExport.existingPlaylistUpdateTooltip': 'The existing playlist will be updated.',
      };
      return map[key] || key;
    },
  }),
}));

const FOLDER_ATTRIBUTE = 1;
const PLAYLIST_ATTRIBUTE = 0;

const mockNodes: RekordboxTreeNode[] = [
  { id: 'folder-1', name: 'My Folder', attribute: FOLDER_ATTRIBUTE, parentId: 'root', seq: 1 },
  { id: 'playlist-1', name: 'My Playlist', attribute: PLAYLIST_ATTRIBUTE, parentId: 'folder-1', seq: 1 },
];

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('RekordboxTreePicker', () => {
  it('renders without newPlaylistName and does not show new playlist preview', () => {
    renderWithTooltip(<RekordboxTreePicker nodes={mockNodes} selectedFolderId={null} onSelectFolder={vi.fn()} />);

    expect(screen.getByText('Rekordbox (root)')).toBeInTheDocument();
    expect(screen.queryByText(/Will be created/)).not.toBeInTheDocument();
  });

  it('renders with newPlaylistName and shows new playlist preview when folder selected', () => {
    renderWithTooltip(
      <RekordboxTreePicker nodes={mockNodes} selectedFolderId={null} onSelectFolder={vi.fn()} newPlaylistName="Test Playlist" />,
    );

    expect(screen.getByText('Rekordbox (root)')).toBeInTheDocument();
    expect(screen.getByText('Will be created: Test Playlist')).toBeInTheDocument();
  });
});
