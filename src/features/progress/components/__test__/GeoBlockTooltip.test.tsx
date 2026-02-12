import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeoBlockTooltip } from '../GeoBlockTooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'errors.geoBlockedDetail': 'Geographic restriction by rights holder',
        'errors.geoBlockedNoRetry': 'This track will not retry automatically',
      };
      return translations[key] || key;
    },
  }),
}));

describe('GeoBlockTooltip', () => {
  it('should render children', () => {
    render(
      <GeoBlockTooltip>
        <button>Trigger</button>
      </GeoBlockTooltip>
    );
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
  });

  it('should show tooltip content on hover', async () => {
    const user = userEvent.setup();
    render(
      <GeoBlockTooltip>
        <button>Hover me</button>
      </GeoBlockTooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' });
    await user.hover(trigger);

    // Wait for tooltip to appear - use getAllByText since Radix may duplicate content
    await waitFor(() => {
      const detailElements = screen.getAllByText('Geographic restriction by rights holder');
      expect(detailElements.length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      const noRetryElements = screen.getAllByText('This track will not retry automatically');
      expect(noRetryElements.length).toBeGreaterThan(0);
    });
  });

  it('should show tooltip content on focus for keyboard accessibility', async () => {
    const user = userEvent.setup();
    render(
      <GeoBlockTooltip>
        <button>Focus me</button>
      </GeoBlockTooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Focus me' });
    await user.tab();

    // Verify focus moved to trigger
    expect(trigger).toHaveFocus();

    // Wait for tooltip to appear
    await waitFor(() => {
      const detailElements = screen.getAllByText('Geographic restriction by rights holder');
      expect(detailElements.length).toBeGreaterThan(0);
    });
  });
});
