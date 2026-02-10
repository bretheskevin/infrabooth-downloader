import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';

// Test component that uses useTranslation hook
function TestComponent({ translationKey, options }: { translationKey: string; options?: Record<string, unknown> }) {
  const { t } = useTranslation();
  return <span data-testid="translation">{t(translationKey, options)}</span>;
}

describe('i18n integration tests', () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  describe('useTranslation hook in components', () => {
    it('should work with useTranslation hook', () => {
      render(<TestComponent translationKey="app.title" />);

      expect(screen.getByTestId('translation')).toHaveTextContent('InfraBooth Downloader');
    });

    it('should handle interpolation with username', () => {
      render(<TestComponent translationKey="auth.signedInAs" options={{ username: 'TestUser' }} />);

      expect(screen.getByTestId('translation')).toHaveTextContent('Signed in as TestUser');
    });

    it('should handle interpolation with special characters in username', () => {
      render(<TestComponent translationKey="auth.signedInAs" options={{ username: '<script>alert("xss")</script>' }} />);

      // escapeValue is false, so HTML is not escaped (React handles this)
      expect(screen.getByTestId('translation')).toHaveTextContent('Signed in as <script>alert("xss")</script>');
    });

    it('should handle multiple interpolation values', () => {
      render(<TestComponent translationKey="download.progress" options={{ current: 5, total: 47 }} />);

      expect(screen.getByTestId('translation')).toHaveTextContent('5 of 47 tracks');
    });
  });

  describe('missing key handling', () => {
    it('should return key name for missing translations', () => {
      render(<TestComponent translationKey="nonexistent.deeply.nested.key" />);

      expect(screen.getByTestId('translation')).toHaveTextContent('nonexistent.deeply.nested.key');
    });
  });

  describe('language switching', () => {
    it('should update translations when language changes to French', async () => {
      const { rerender } = render(<TestComponent translationKey="auth.signIn" />);

      expect(screen.getByTestId('translation')).toHaveTextContent('Sign in with SoundCloud');

      await act(async () => {
        await i18n.changeLanguage('fr');
      });

      rerender(<TestComponent translationKey="auth.signIn" />);

      expect(screen.getByTestId('translation')).toHaveTextContent('Connexion avec SoundCloud');
    });

    it('should handle interpolation in French', async () => {
      await act(async () => {
        await i18n.changeLanguage('fr');
      });

      render(<TestComponent translationKey="download.progress" options={{ current: 10, total: 25 }} />);

      expect(screen.getByTestId('translation')).toHaveTextContent('10 sur 25 pistes');
    });
  });

  describe('error messages', () => {
    it('should have all error codes translated', () => {
      const errorKeys = [
        'errors.invalidUrl',
        'errors.geoBlocked',
        'errors.rateLimited',
        'errors.networkError',
        'errors.downloadFailed',
        'errors.conversionFailed',
      ];

      errorKeys.forEach((key) => {
        expect(i18n.exists(key)).toBe(true);
      });
    });

    it('should translate error messages appropriately', () => {
      render(<TestComponent translationKey="errors.rateLimited" />);

      expect(screen.getByTestId('translation')).toHaveTextContent('Brief pause — SoundCloud rate limit (this is normal)');
    });
  });
});
