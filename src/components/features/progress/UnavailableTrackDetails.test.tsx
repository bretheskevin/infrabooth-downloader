import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UnavailableTrackDetails } from './UnavailableTrackDetails';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'errors.showDetails': 'Show details',
        'errors.trackUnavailableDetail': 'This track may have been removed or made private',
      };
      return translations[key] || key;
    },
  }),
}));

describe('UnavailableTrackDetails', () => {
  it('should render "Show details" trigger button', () => {
    render(<UnavailableTrackDetails />);
    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should not show details content initially', () => {
    render(<UnavailableTrackDetails />);
    expect(
      screen.queryByText('This track may have been removed or made private')
    ).not.toBeInTheDocument();
  });

  it('should expand details when clicked', async () => {
    const user = userEvent.setup();
    render(<UnavailableTrackDetails />);

    const trigger = screen.getByText('Show details');
    await user.click(trigger);

    expect(
      screen.getByText('This track may have been removed or made private')
    ).toBeInTheDocument();
  });

  it('should collapse details when clicked again', async () => {
    const user = userEvent.setup();
    render(<UnavailableTrackDetails />);

    const trigger = screen.getByText('Show details');

    // Expand
    await user.click(trigger);
    expect(
      screen.getByText('This track may have been removed or made private')
    ).toBeInTheDocument();

    // Collapse
    await user.click(trigger);

    // Content should be hidden (visually, though may still be in DOM due to animation)
    // The collapsible content area should have aria-expanded=false
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should have correct aria-expanded state', async () => {
    const user = userEvent.setup();
    render(<UnavailableTrackDetails />);

    const trigger = screen.getByText('Show details');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('should use amber color for the trigger', () => {
    render(<UnavailableTrackDetails />);

    const trigger = screen.getByText('Show details');
    expect(trigger).toHaveClass('text-amber-600');
  });
});
