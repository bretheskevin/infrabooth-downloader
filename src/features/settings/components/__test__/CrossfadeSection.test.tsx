import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrossfadeSection } from '../CrossfadeSection';
import { useSettingsStore } from '../../store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'settings.crossfade': 'Crossfade',
        'settings.crossfadeDescription': 'Smoothly transition between tracks',
        'settings.crossfadeDuration': 'Duration',
      };
      if (key === 'settings.crossfadeSeconds' && opts?.count !== undefined)
        return `${opts.count}s`;
      return map[key] ?? key;
    },
  }),
}));

describe('CrossfadeSection', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      crossfadeEnabled: false,
      crossfadeDuration: 5,
    });
  });

  it('renders toggle in off state by default', () => {
    render(<CrossfadeSection />);
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('does not render duration slider when disabled', () => {
    render(<CrossfadeSection />);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('renders duration slider when enabled', () => {
    useSettingsStore.setState({ crossfadeEnabled: true });
    render(<CrossfadeSection />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('toggles crossfade on', async () => {
    render(<CrossfadeSection />);
    await userEvent.click(screen.getByRole('switch'));
    expect(useSettingsStore.getState().crossfadeEnabled).toBe(true);
  });

  it('slider has accessible label', () => {
    useSettingsStore.setState({ crossfadeEnabled: true });
    render(<CrossfadeSection />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'Duration');
  });

  it('displays current duration value', () => {
    useSettingsStore.setState({ crossfadeEnabled: true, crossfadeDuration: 8 });
    render(<CrossfadeSection />);
    expect(screen.getByText('8s')).toBeInTheDocument();
  });
});
