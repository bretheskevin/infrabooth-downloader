import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuccessMessage } from './SuccessMessage';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'completion.title': 'Download complete!',
        'completion.titlePartial': 'Download finished',
        'completion.allTracksDownloaded': `All ${options?.total} tracks downloaded`,
        'completion.tracksDownloaded': `${options?.completed} of ${options?.total} tracks downloaded`,
      };
      return translations[key] || key;
    },
  }),
}));

describe('SuccessMessage', () => {
  it('should render full success message when all tracks completed', () => {
    render(
      <SuccessMessage completedCount={10} totalCount={10} isFullSuccess={true} />
    );

    expect(screen.getByText('Download complete!')).toBeInTheDocument();
    expect(screen.getByText('All 10 tracks downloaded')).toBeInTheDocument();
  });

  it('should render partial success message when some tracks failed', () => {
    render(
      <SuccessMessage completedCount={8} totalCount={10} isFullSuccess={false} />
    );

    expect(screen.getByText('Download finished')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 tracks downloaded')).toBeInTheDocument();
  });

  it('should render single track success', () => {
    render(
      <SuccessMessage completedCount={1} totalCount={1} isFullSuccess={true} />
    );

    expect(screen.getByText('Download complete!')).toBeInTheDocument();
    expect(screen.getByText('All 1 tracks downloaded')).toBeInTheDocument();
  });

  it('should have correct heading structure', () => {
    render(
      <SuccessMessage completedCount={10} totalCount={10} isFullSuccess={true} />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Download complete!');
  });
});
