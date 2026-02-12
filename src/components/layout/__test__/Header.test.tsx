import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import i18n from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store';

// Mock auth module
vi.mock('@/features/auth/api', () => ({
  startOAuth: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Tauri dialog plugin for SettingsPanel
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// Mock Tauri core invoke for SettingsPanel
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Header', () => {
  beforeEach(async () => {
    useAuthStore.setState({ isSignedIn: false, username: null, plan: null });
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

  it('should render AuthContainer with sign-in button when not authenticated', () => {
    render(<Header />);

    expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).toBeInTheDocument();
  });

  it('should render AuthContainer with UserMenu when authenticated', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser', plan: 'Pro Unlimited' });

    render(<Header />);

    // UserMenu displays username and quality badge in a dropdown trigger
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Go+')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in with SoundCloud' })).not.toBeInTheDocument();
  });

  it('should render settings button', () => {
    render(<Header />);

    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('should open settings panel when settings button is clicked', async () => {
    render(<Header />);

    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    fireEvent.click(settingsButton);

    await act(async () => {
      // Wait for dialog to open
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should close settings panel when close button is clicked', async () => {
    render(<Header />);

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    fireEvent.click(settingsButton);

    await act(async () => {
      // Wait for dialog to open
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close settings
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await act(async () => {
      // Wait for dialog to close
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should have accessible settings button with aria-label', () => {
    render(<Header />);

    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    expect(settingsButton).toHaveAttribute('aria-label', 'Open settings');
  });
});
