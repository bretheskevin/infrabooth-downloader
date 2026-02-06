import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/lib/i18n';
import { App } from './App';
import { useAuthStore } from '@/stores/authStore';

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
  startOAuth: vi.fn(),
  completeOAuth: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    useAuthStore.setState({ isSignedIn: false, username: null });
  });

  it('should render the app title', () => {
    render(<App />);
    expect(screen.getByText('InfraBooth Downloader')).toBeDefined();
  });

  it('should render the welcome message', () => {
    render(<App />);
    expect(screen.getByText('Welcome to InfraBooth Downloader')).toBeDefined();
  });

  it('should render sign-in button when not authenticated', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).toBeInTheDocument();
  });
});
