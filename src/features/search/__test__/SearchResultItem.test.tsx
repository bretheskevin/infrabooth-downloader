import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SearchResultItem } from '../components/SearchResultItem';
import type { TrackInfo } from '@/bindings';
import type { DownloadState } from '@/types/download';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockTrack: TrackInfo = {
  id: 123,
  title: 'Test Track',
  user: { username: 'TestArtist', avatar_url: null },
  artwork_url: null,
  duration: 180000,
  permalink_url: '',
} as TrackInfo;

describe('SearchResultItem', () => {
  it('renders track info in idle state', () => {
    const state: DownloadState = { status: 'idle' };
    render(
      <SearchResultItem
        track={mockTrack}
        index={0}
        state={state}
        onDownload={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('TestArtist')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('calls onDownload when download button clicked', () => {
    const onDownload = vi.fn();
    const state: DownloadState = { status: 'idle' };
    render(
      <SearchResultItem
        track={mockTrack}
        index={0}
        state={state}
        onDownload={onDownload}
        onRetry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onDownload).toHaveBeenCalledOnce();
  });

  it('shows progress percentage when downloading', () => {
    const state: DownloadState = { status: 'downloading', progress: 0.65 };
    render(
      <SearchResultItem
        track={mockTrack}
        index={0}
        state={state}
        onDownload={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('shows checkmark when completed', () => {
    const state: DownloadState = { status: 'completed' };
    const { container } = render(
      <TooltipProvider>
        <SearchResultItem
          track={mockTrack}
          index={0}
          state={state}
          onDownload={vi.fn()}
          onRetry={vi.fn()}
        />
      </TooltipProvider>,
    );
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('shows retry button on error', () => {
    const onRetry = vi.fn();
    const state: DownloadState = { status: 'error', error: 'Network timeout' };
    render(
      <SearchResultItem
        track={mockTrack}
        index={0}
        state={state}
        onDownload={vi.fn()}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
