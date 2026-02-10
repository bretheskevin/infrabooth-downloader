import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageSection } from './LanguageSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.language': 'Language',
        'settings.languageDescription': 'Choose your preferred language',
        'settings.comingSoon': '(Selector coming in Story 8.2)',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

describe('LanguageSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the language label', () => {
    render(<LanguageSection />);

    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('renders the language description', () => {
    render(<LanguageSection />);

    expect(screen.getByText('Choose your preferred language')).toBeInTheDocument();
  });

  it('displays current language as English', () => {
    render(<LanguageSection />);

    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('shows placeholder message for future selector', () => {
    render(<LanguageSection />);

    expect(screen.getByText('(Selector coming in Story 8.2)')).toBeInTheDocument();
  });

  it('has accessible structure with label', () => {
    render(<LanguageSection />);

    const label = screen.getByText('Language');
    expect(label).toHaveClass('font-medium');
  });
});

describe('LanguageSection language display logic', () => {
  it('displays English when i18n language is en', () => {
    render(<LanguageSection />);
    // Current language display based on mocked i18n.language = 'en'
    expect(screen.getByText('English')).toBeInTheDocument();
  });
});
