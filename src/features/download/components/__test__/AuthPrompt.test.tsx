import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthPrompt } from '../AuthPrompt';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.signInRequired': 'Sign in to download',
      };
      return translations[key] || key;
    },
  }),
}));

describe('AuthPrompt', () => {
  it('should render sign-in required message (AC #5)', () => {
    render(<AuthPrompt />);

    expect(screen.getByText('Sign in to download')).toBeInTheDocument();
  });

  it('should have overlay styling with backdrop blur', () => {
    render(<AuthPrompt />);

    const overlay = screen.getByText('Sign in to download').parentElement;
    expect(overlay).toHaveClass('absolute');
    expect(overlay).toHaveClass('inset-0');
    expect(overlay).toHaveClass('backdrop-blur-sm');
  });

  it('should have semi-transparent background', () => {
    render(<AuthPrompt />);

    const overlay = screen.getByText('Sign in to download').parentElement;
    expect(overlay).toHaveClass('bg-background/80');
  });

  it('should center content', () => {
    render(<AuthPrompt />);

    const overlay = screen.getByText('Sign in to download').parentElement;
    expect(overlay).toHaveClass('flex');
    expect(overlay).toHaveClass('items-center');
    expect(overlay).toHaveClass('justify-center');
  });
});
