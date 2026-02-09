import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UrlInput } from './UrlInput';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'download.pasteUrl': 'Paste a SoundCloud playlist or track URL',
      };
      return translations[key] || key;
    },
  }),
}));

describe('UrlInput', () => {
  const mockOnUrlChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render input with placeholder text (AC #1)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    expect(input).toBeInTheDocument();
  });

  it('should have type="url" for semantic correctness (AC #4)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    expect(input).toHaveAttribute('type', 'url');
  });

  it('should have aria-label for screen readers (AC #4)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByLabelText('Paste a SoundCloud playlist or track URL');
    expect(input).toBeInTheDocument();
  });

  it('should call onUrlChange when value changes (AC #3)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    fireEvent.change(input, { target: { value: 'https://soundcloud.com/test' } });

    expect(mockOnUrlChange).toHaveBeenCalledWith('https://soundcloud.com/test');
  });

  it('should trigger onUrlChange on paste event (AC #3)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');

    // Simulate paste by changing value (paste triggers change event)
    fireEvent.change(input, { target: { value: 'https://soundcloud.com/pasted-url' } });

    expect(mockOnUrlChange).toHaveBeenCalledWith('https://soundcloud.com/pasted-url');
  });

  it('should be disabled when disabled prop is true (AC #5)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} disabled />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    expect(input).toBeDisabled();
  });

  it('should have prominent height styling h-12 (AC #1)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    expect(input).toHaveClass('h-12');
  });

  it('should have readable text size text-base (AC #1)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    expect(input).toHaveClass('text-base');
  });

  it('should have focus ring styling (AC #2)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    expect(input).toHaveClass('focus-visible:ring-2');
    expect(input).toHaveClass('focus-visible:ring-indigo-500');
  });

  it('should accept custom className', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} className="custom-class" />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    expect(input).toHaveClass('custom-class');
  });

  it('should be keyboard navigable (AC #4)', () => {
    render(<UrlInput onUrlChange={mockOnUrlChange} />);

    const input = screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL');
    input.focus();
    expect(document.activeElement).toBe(input);
  });
});
