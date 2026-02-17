import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageSection } from '../LanguageSection';

const mockSetLanguage = vi.fn();
let mockLanguage = 'en';
const mockChangeLanguage = vi.fn();

// Mock settingsStore
vi.mock('@/features/settings/store', () => ({
  useSettingsStore: (selector: (state: { language: string; setLanguage: (lang: string) => void }) => unknown) =>
    selector({ language: mockLanguage, setLanguage: mockSetLanguage }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { language?: string }) => {
      const translations: Record<string, string> = {
        'settings.language': 'Language',
        'settings.languageDescription': 'Choose your preferred language',
        'settings.languageEnglish': 'English',
        'settings.languageFrench': 'Français',
        'accessibility.languageChanged': `Language changed to ${options?.language ?? ''}`,
      };
      return translations[key] || key;
    },
    i18n: {
      language: mockLanguage,
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

// Mock Radix Select to avoid JSDOM compatibility issues with portals
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (val: string) => void }) => (
    <div data-testid="select-root" data-value={value}>
      {children}
      <button data-testid="select-change-to-fr" onClick={() => onValueChange('fr')}>
        Change to French
      </button>
      <button data-testid="select-change-to-en" onClick={() => onValueChange('en')}>
        Change to English
      </button>
    </div>
  ),
  SelectTrigger: ({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) => (
    <button role="combobox" id={id} className={className} aria-expanded="false" data-testid="select-trigger">
      {children}
    </button>
  ),
  SelectValue: ({ children }: { children: React.ReactNode }) => <span data-testid="select-value">{children}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div role="listbox" hidden>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div role="option" data-value={value}>
      {children}
    </div>
  ),
}));

describe('LanguageSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'en';
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    const announcements = document.querySelectorAll('[role="status"]');
    announcements.forEach((el) => el.remove());
  });

  it('renders the language label', () => {
    render(<LanguageSection />);

    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('renders the language description', () => {
    render(<LanguageSection />);

    expect(screen.getByText('Choose your preferred language')).toBeInTheDocument();
  });

  it('renders a Select component (combobox)', () => {
    render(<LanguageSection />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
  });

  it('displays current language value in Select', () => {
    render(<LanguageSection />);

    const selectValue = screen.getByTestId('select-value');
    expect(selectValue).toHaveTextContent('English');
  });

  it('has correct id for label association', () => {
    render(<LanguageSection />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('id', 'language-select');

    const label = screen.getByText('Language');
    expect(label).toHaveAttribute('for', 'language-select');
  });

  it('calls setLanguage when language is changed', async () => {
    const user = userEvent.setup();
    render(<LanguageSection />);

    const changeButton = screen.getByTestId('select-change-to-fr');
    await user.click(changeButton);

    expect(mockSetLanguage).toHaveBeenCalledWith('fr');
  });

  it('calls i18n.changeLanguage when language is changed', async () => {
    const user = userEvent.setup();
    render(<LanguageSection />);

    const changeButton = screen.getByTestId('select-change-to-fr');
    await user.click(changeButton);

    expect(mockChangeLanguage).toHaveBeenCalledWith('fr');
  });

  it('updates document lang attribute when language changes', async () => {
    const user = userEvent.setup();
    render(<LanguageSection />);

    const changeButton = screen.getByTestId('select-change-to-fr');
    await user.click(changeButton);

    expect(document.documentElement.lang).toBe('fr');
  });

  it('creates screen reader announcement on language change to French', async () => {
    const user = userEvent.setup();
    render(<LanguageSection />);

    const changeButton = screen.getByTestId('select-change-to-fr');
    await user.click(changeButton);

    const announcement = document.querySelector('[role="status"][aria-live="polite"]');
    expect(announcement).toBeInTheDocument();
    expect(announcement).toHaveTextContent('Language changed to Français');
  });

  it('creates screen reader announcement on language change to English', async () => {
    const user = userEvent.setup();
    mockLanguage = 'fr';
    render(<LanguageSection />);

    const changeButton = screen.getByTestId('select-change-to-en');
    await user.click(changeButton);

    const announcement = document.querySelector('[role="status"][aria-live="polite"]');
    expect(announcement).toBeInTheDocument();
    expect(announcement).toHaveTextContent('Language changed to English');
  });

  it('can be focused with Tab', async () => {
    const user = userEvent.setup();
    render(<LanguageSection />);

    await user.tab();

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveFocus();
  });

  it('announcement element has sr-only class and will be removed', async () => {
    const user = userEvent.setup();
    render(<LanguageSection />);

    const changeButton = screen.getByTestId('select-change-to-fr');
    await user.click(changeButton);

    const announcement = document.querySelector('[role="status"][aria-live="polite"]');
    expect(announcement).toHaveClass('sr-only');
    expect(announcement).toHaveAttribute('aria-atomic', 'true');
  });
});

describe('LanguageSection with French selected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'fr';
  });

  it('displays Français when French is selected', () => {
    render(<LanguageSection />);

    const selectValue = screen.getByTestId('select-value');
    expect(selectValue).toHaveTextContent('Français');
  });
});

describe('LanguageSection accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'en';
  });

  afterEach(() => {
    const announcements = document.querySelectorAll('[role="status"]');
    announcements.forEach((el) => el.remove());
  });

  it('has accessible label via htmlFor/id association', () => {
    render(<LanguageSection />);

    const trigger = screen.getByRole('combobox');
    expect(trigger.id).toBe('language-select');

    const label = document.querySelector('label[for="language-select"]');
    expect(label).toHaveTextContent('Language');
  });

  it('screen reader announcement has correct ARIA attributes', async () => {
    const user = userEvent.setup();
    render(<LanguageSection />);

    const changeButton = screen.getByTestId('select-change-to-fr');
    await user.click(changeButton);

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toHaveAttribute('aria-atomic', 'true');
    expect(announcement).toHaveClass('sr-only');
  });
});
