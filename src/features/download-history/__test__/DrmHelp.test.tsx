import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DrmHelp } from '../components/DrmHelp';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'downloadHistory.drmHelpTitle': 'DRM-protected track',
        'downloadHistory.drmHelpBody': 'This track is protected by DRM.',
      };
      return translations[key] || key;
    },
  }),
}));

describe('DrmHelp', () => {
  it('renders a help button', () => {
    render(
      <TooltipProvider>
        <DrmHelp />
      </TooltipProvider>,
    );
    expect(screen.getByRole('button', { name: /drm/i })).toBeInTheDocument();
  });

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <DrmHelp />
      </TooltipProvider>,
    );
    await user.hover(screen.getByRole('button', { name: /drm/i }));
    await waitFor(() => {
      expect(screen.getAllByText('DRM-protected track').length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.getAllByText('This track is protected by DRM.').length).toBeGreaterThan(0);
    });
  });
});
