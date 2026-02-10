import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FailedTracksLink } from './FailedTracksLink';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'completion.failedTracks': `${options?.count} tracks couldn't be downloaded`,
        'completion.failedTracksSingular': "1 track couldn't be downloaded",
        'completion.viewFailed': 'View details',
      };
      return translations[key] || key;
    },
  }),
}));

describe('FailedTracksLink', () => {
  it('should render nothing when failedCount is 0', () => {
    const { container } = render(
      <FailedTracksLink failedCount={0} onClick={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render singular message when 1 track failed', () => {
    render(<FailedTracksLink failedCount={1} onClick={vi.fn()} />);

    expect(
      screen.getByText("1 track couldn't be downloaded")
    ).toBeInTheDocument();
  });

  it('should render plural message when multiple tracks failed', () => {
    render(<FailedTracksLink failedCount={3} onClick={vi.fn()} />);

    expect(
      screen.getByText("3 tracks couldn't be downloaded")
    ).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();

    render(<FailedTracksLink failedCount={2} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should have warning color styling', () => {
    render(<FailedTracksLink failedCount={2} onClick={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-amber-600');
  });

  it('should have accessible aria-label', () => {
    render(<FailedTracksLink failedCount={2} onClick={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      "2 tracks couldn't be downloaded. View details"
    );
  });
});
