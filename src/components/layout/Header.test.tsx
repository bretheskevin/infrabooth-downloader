import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Header } from './Header';
import i18n from '@/lib/i18n';

describe('Header', () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('should render the app title from translations', () => {
    render(<Header />);

    expect(screen.getByText('InfraBooth Downloader')).toBeInTheDocument();
  });

  it('should use the t function for the title', () => {
    render(<Header />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('InfraBooth Downloader');
  });

  it('should update title when language changes to French', async () => {
    render(<Header />);

    await act(async () => {
      await i18n.changeLanguage('fr');
    });

    // App title is same in both languages as per spec
    expect(screen.getByText('InfraBooth Downloader')).toBeInTheDocument();
  });
});
