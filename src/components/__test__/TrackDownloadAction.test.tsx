import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TrackDownloadAction } from '../TrackDownloadAction';
import type { DownloadState } from '@/types/download';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderAction = (state: DownloadState) =>
  render(
    <TooltipProvider>
      <TrackDownloadAction state={state} onDownload={vi.fn()} onRetry={vi.fn()} />
    </TooltipProvider>,
  );

describe('TrackDownloadAction', () => {
  it('shows a retry button for a regular error', () => {
    renderAction({ status: 'error', error: 'ffmpeg exited with code 1' });
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeInTheDocument();
  });

  it('shows a DRM indicator instead of a retry button for DRM-protected tracks', () => {
    renderAction({ status: 'error', error: 'DRM protected (FairPlay/Widevine CENC)' });
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('errors.drmProtected')).toBeInTheDocument();
  });
});
