import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationFeedback } from '../ValidationFeedback';
import type { ValidationResult } from '@/features/url-input/types/url';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.validPlaylist': 'Valid playlist URL',
        'download.validTrack': 'Valid track URL',
        'download.validShortLink': 'Valid SoundCloud link',
        'download.validating': 'Checking URL...',
        'errors.invalidUrl': 'Not a SoundCloud URL',
        'errors.invalidUrlFormat': 'Invalid URL format',
        'errors.invalidUrlHint': 'Paste a link from soundcloud.com',
        'errors.profileNotSupported': 'This is a profile, not a playlist or track',
        'errors.profileNotSupportedHint': 'Try pasting a playlist or track link',
        'errors.networkError': 'No internet connection',
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
      error: null,
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
      error: null,
    };

    it('should show success message for track (AC #2)', () => {
      render(
        <ValidationFeedback result={validTrackResult} isValidating={false} />
      );

      expect(screen.getByText('Valid track URL')).toBeInTheDocument();
    });
  });

  describe('when validation succeeds with short link', () => {
    const validShortLinkResult: ValidationResult = {
      valid: true,
      urlType: null, // Short links have no type until resolved
      error: null,
    };

    it('should show success message for short link', () => {
      render(
        <ValidationFeedback result={validShortLinkResult} isValidating={false} />
      );

      expect(screen.getByText('Valid SoundCloud link')).toBeInTheDocument();
    });

    it('should hide short link message when media is loaded', () => {
      const { container } = render(
        <ValidationFeedback
          result={validShortLinkResult}
          isValidating={false}
          hideWhenMediaLoaded={true}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show short link message when media is not loaded', () => {
      render(
        <ValidationFeedback
          result={validShortLinkResult}
          isValidating={false}
          hideWhenMediaLoaded={false}
        />
      );

      expect(screen.getByText('Valid SoundCloud link')).toBeInTheDocument();
    });
  });

  describe('when validation fails', () => {
    const errorResult: ValidationResult = {
      valid: false,
      urlType: null,
      error: {
        code: 'INVALID_URL',
        message: 'Not a SoundCloud URL', // This is ignored; translation is used
        hint: 'Paste a link from soundcloud.com', // This is ignored; translation is used
      },
    };

    it('should show translated error message based on error code (AC #3)', () => {
      render(
        <ValidationFeedback result={errorResult} isValidating={false} />
      );

      // The component now translates based on error code, not the raw message
      expect(screen.getByText('Not a SoundCloud URL')).toBeInTheDocument();
    });

    it('should show translated hint text below error (AC #3)', () => {
      render(
        <ValidationFeedback result={errorResult} isValidating={false} />
      );

      // The component now translates based on error code, not the raw hint
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
    // Use INVALID_FORMAT code which has no hint mapping
    const errorResultNoHint: ValidationResult = {
      valid: false,
      urlType: null,
      error: {
        code: 'UNKNOWN_ERROR', // Unknown code falls back to invalidUrlFormat with no hint
        message: 'Some error',
        hint: null,
      },
    };

    it('should show fallback error message for unknown error codes (AC #3)', () => {
      render(
        <ValidationFeedback result={errorResultNoHint} isValidating={false} />
      );

      // Unknown error codes fall back to invalidUrlFormat translation
      expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
    });

    it('should not render hint paragraph when error code has no hint mapping', () => {
      render(
        <ValidationFeedback result={errorResultNoHint} isValidating={false} />
      );

      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs.length).toBe(0);
    });
  });
});
