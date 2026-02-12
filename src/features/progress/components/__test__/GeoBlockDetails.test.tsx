import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeoBlockDetails } from '../GeoBlockDetails';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'errors.showDetails': 'Show details',
        'errors.geoBlockedDetail': 'Geographic restriction by rights holder',
        'errors.geoBlockedNoRetry': 'This track will not retry automatically',
      };
      return translations[key] || key;
    },
  }),
}));

describe('GeoBlockDetails', () => {
  it('should render trigger button', () => {
    render(<GeoBlockDetails />);
    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should not show details by default', () => {
    render(<GeoBlockDetails />);
    expect(
      screen.queryByText('Geographic restriction by rights holder')
    ).not.toBeInTheDocument();
  });

  it('should expand and show details on click', async () => {
    const user = userEvent.setup();
    render(<GeoBlockDetails />);

    const trigger = screen.getByText('Show details');
    await user.click(trigger);

    expect(
      screen.getByText('Geographic restriction by rights holder')
    ).toBeInTheDocument();
    expect(
      screen.getByText('This track will not retry automatically')
    ).toBeInTheDocument();
  });

  it('should collapse on second click', async () => {
    const user = userEvent.setup();
    render(<GeoBlockDetails />);

    const trigger = screen.getByText('Show details');

    // Open
    await user.click(trigger);
    expect(
      screen.getByText('Geographic restriction by rights holder')
    ).toBeInTheDocument();

    // Close
    await user.click(trigger);
    // Content should be hidden (may still be in DOM but not visible)
    const content = screen.queryByText('Geographic restriction by rights holder');
    if (content) {
      // If still in DOM, verify it's inside a collapsed element
      expect(content.closest('[data-state="closed"]')).toBeTruthy();
    }
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<GeoBlockDetails />);

    // Tab to trigger
    await user.tab();

    const trigger = screen.getByText('Show details');
    expect(trigger).toHaveFocus();

    // Press Enter to expand
    await user.keyboard('{Enter}');

    expect(
      screen.getByText('Geographic restriction by rights holder')
    ).toBeInTheDocument();
  });

  it('should have correct aria-expanded attribute', async () => {
    const user = userEvent.setup();
    render(<GeoBlockDetails />);

    const trigger = screen.getByText('Show details');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
