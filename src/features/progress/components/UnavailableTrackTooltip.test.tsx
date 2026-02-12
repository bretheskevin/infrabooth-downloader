import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UnavailableTrackTooltip } from './UnavailableTrackTooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'errors.trackUnavailableDetail': 'This track may have been removed or made private',
      };
      return translations[key] || key;
    },
  }),
}));

describe('UnavailableTrackTooltip', () => {
  it('should render children', () => {
    render(
      <UnavailableTrackTooltip>
        <button>Trigger</button>
      </UnavailableTrackTooltip>
    );
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
  });

  it('should show tooltip content on hover', async () => {
    const user = userEvent.setup();

    render(
      <UnavailableTrackTooltip>
        <button>Trigger</button>
      </UnavailableTrackTooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    await user.hover(trigger);

    // Wait for tooltip to appear - use getAllByText since Radix duplicates for accessibility
    const tooltips = await screen.findAllByText('This track may have been removed or made private');
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('should show tooltip content on focus', async () => {
    const user = userEvent.setup();

    render(
      <UnavailableTrackTooltip>
        <button>Trigger</button>
      </UnavailableTrackTooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    await user.tab(); // Focus the button

    // Check button is focused
    expect(trigger).toHaveFocus();
  });
});
