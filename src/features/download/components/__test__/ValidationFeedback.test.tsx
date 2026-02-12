import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationFeedback } from '../ValidationFeedback';
import type { ValidationResult } from '@/features/download/types/url';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.validPlaylist': 'Valid playlist URL',
        'download.validTrack': 'Valid track URL',
        'download.validating': 'Checking URL...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ValidationFeedback', () => {
  describe('when validating', () => {
    it('should render nothing while validating (AC #1)', () => {
      const { container } = render(
        <ValidationFeedback result={null} isValidating={true} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when no result', () => {
    it('should render nothing when result is null (AC #4)', () => {
      const { container } = render(
        <ValidationFeedback result={null} isValidating={false} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when validation succeeds with playlist', () => {
    const validPlaylistResult: ValidationResult = {
      valid: true,
      urlType: 'playlist',
    };

    it('should show success message for playlist (AC #2)', () => {
      render(
        <ValidationFeedback result={validPlaylistResult} isValidating={false} />
      );

      expect(screen.getByText('Valid playlist URL')).toBeInTheDocument();
    });

    it('should show checkmark icon for success (AC #2)', () => {
      render(
        <ValidationFeedback result={validPlaylistResult} isValidating={false} />
      );

      // The CheckCircle2 icon should be present
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have role="status" for success (AC #5)', () => {
      render(
        <ValidationFeedback result={validPlaylistResult} isValidating={false} />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-live="polite" for success announcements (AC #5)', () => {
      render(
        <ValidationFeedback result={validPlaylistResult} isValidating={false} />
      );

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('when validation succeeds with track', () => {
    const validTrackResult: ValidationResult = {
      valid: true,
      urlType: 'track',
    };

    it('should show success message for track (AC #2)', () => {
      render(
        <ValidationFeedback result={validTrackResult} isValidating={false} />
      );

      expect(screen.getByText('Valid track URL')).toBeInTheDocument();
    });
  });

  describe('when validation fails', () => {
    const errorResult: ValidationResult = {
      valid: false,
      error: {
        code: 'INVALID_URL',
        message: 'Not a SoundCloud URL',
        hint: 'Paste a link from soundcloud.com',
      },
    };

    it('should show error message (AC #3)', () => {
      render(
        <ValidationFeedback result={errorResult} isValidating={false} />
      );

      expect(screen.getByText('Not a SoundCloud URL')).toBeInTheDocument();
    });

    it('should show hint text below error (AC #3)', () => {
      render(
        <ValidationFeedback result={errorResult} isValidating={false} />
      );

      expect(screen.getByText('Paste a link from soundcloud.com')).toBeInTheDocument();
    });

    it('should have role="alert" for errors (AC #5)', () => {
      render(
        <ValidationFeedback result={errorResult} isValidating={false} />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="assertive" for error announcements (AC #5)', () => {
      render(
        <ValidationFeedback result={errorResult} isValidating={false} />
      );

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('should show error icon (AC #3)', () => {
      render(
        <ValidationFeedback result={errorResult} isValidating={false} />
      );

      // The AlertCircle icon should be present
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('when validation fails without hint', () => {
    const errorResultNoHint: ValidationResult = {
      valid: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'No internet connection',
      },
    };

    it('should show error message without hint (AC #3)', () => {
      render(
        <ValidationFeedback result={errorResultNoHint} isValidating={false} />
      );

      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });

    it('should not render hint paragraph when no hint provided', () => {
      render(
        <ValidationFeedback result={errorResultNoHint} isValidating={false} />
      );

      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs.length).toBe(0);
    });
  });
});
