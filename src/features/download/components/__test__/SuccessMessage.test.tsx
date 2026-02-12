import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuccessMessage } from '../SuccessMessage';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'completion.title': 'Download complete!',
        'completion.titlePartial': 'Download finished',
        'completion.titleCancelled': 'Download cancelled',
        'completion.allTracksDownloaded': `All ${options?.total} tracks downloaded`,
        'completion.tracksDownloaded': `${options?.completed} of ${options?.total} tracks downloaded`,
        'completion.tracksCancelled': `${options?.completed} tracks downloaded before cancellation`,
        'completion.allCancelled': 'No tracks were downloaded',
      };
      return translations[key] || key;
    },
  }),
}));

describe('SuccessMessage', () => {
  const defaultProps = {
    completedCount: 10,
    totalCount: 10,
    cancelledCount: 0,
    isFullSuccess: true,
    isCancelled: false,
  };

  it('should render full success message when all tracks completed', () => {
    render(<SuccessMessage {...defaultProps} />);

    expect(screen.getByText('Download complete!')).toBeInTheDocument();
    expect(screen.getByText('All 10 tracks downloaded')).toBeInTheDocument();
  });

  it('should render partial success message when some tracks failed', () => {
    render(
      <SuccessMessage
        {...defaultProps}
        completedCount={8}
        isFullSuccess={false}
      />
    );

    expect(screen.getByText('Download finished')).toBeInTheDocument();
    expect(screen.getByText('8 of 10 tracks downloaded')).toBeInTheDocument();
  });

  it('should render single track success', () => {
    render(
      <SuccessMessage
        {...defaultProps}
        completedCount={1}
        totalCount={1}
      />
    );

    expect(screen.getByText('Download complete!')).toBeInTheDocument();
    expect(screen.getByText('All 1 tracks downloaded')).toBeInTheDocument();
  });

  it('should have correct heading structure', () => {
    render(<SuccessMessage {...defaultProps} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Download complete!');
  });

  it('should render cancelled message when download was cancelled with some tracks downloaded', () => {
    render(
      <SuccessMessage
        {...defaultProps}
        completedCount={3}
        cancelledCount={7}
        isFullSuccess={false}
        isCancelled={true}
      />
    );

    expect(screen.getByText('Download cancelled')).toBeInTheDocument();
    expect(screen.getByText('3 tracks downloaded before cancellation')).toBeInTheDocument();
  });

  it('should render cancelled message when download was cancelled with no tracks downloaded', () => {
    render(
      <SuccessMessage
        {...defaultProps}
        completedCount={0}
        cancelledCount={10}
        isFullSuccess={false}
        isCancelled={true}
      />
    );

    expect(screen.getByText('Download cancelled')).toBeInTheDocument();
    expect(screen.getByText('No tracks were downloaded')).toBeInTheDocument();
  });
});
