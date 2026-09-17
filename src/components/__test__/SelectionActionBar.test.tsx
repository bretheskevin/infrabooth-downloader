import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SelectionActionBar } from '../SelectionActionBar';

let mockDownloadEnabled = true;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.download': 'Download',
        'common.selected': 'Selected',
        'rekordboxExport.excludeSelected': 'Exclude',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/features/settings', () => ({
  useIsDownloadEnabled: () => mockDownloadEnabled,
}));

vi.mock('@/features/player', () => ({
  usePlayerStore: (selector: (s: { isQueueOpen: boolean }) => unknown) => selector({ isQueueOpen: false }),
}));

vi.mock('@/features/player/hooks/useIsExpandedBarVisible', () => ({
  useIsExpandedBarVisible: () => false,
}));

vi.mock('@/features/player/components/ExpandedBar', () => ({
  EXPANDED_BAR_HEIGHT: 64,
}));

describe('SelectionActionBar', () => {
  it('shows the download button when there are downloadable tracks', () => {
    mockDownloadEnabled = true;
    render(<SelectionActionBar selectedCount={3} downloadableCount={2} onDownload={vi.fn()} />);
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('hides the download button when nothing selectable is left to download', () => {
    mockDownloadEnabled = true;
    render(<SelectionActionBar selectedCount={3} downloadableCount={0} onDownload={vi.fn()} onExcludeFromExport={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exclude/i })).toBeInTheDocument();
  });

  it('renders nothing when no action is available', () => {
    mockDownloadEnabled = true;
    const { container } = render(<SelectionActionBar selectedCount={3} downloadableCount={0} onDownload={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no tracks are selected', () => {
    mockDownloadEnabled = true;
    const { container } = render(<SelectionActionBar selectedCount={0} downloadableCount={2} onDownload={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
