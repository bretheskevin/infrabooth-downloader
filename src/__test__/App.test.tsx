import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/lib/i18n';
import { App } from '../App';
import { useAuthStore } from '@/features/auth/store';
import { createQueryWrapper } from '@/test/queryWrapper';

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

// Mock auth module
vi.mock('@/features/auth/api', () => ({
  startOAuth: vi.fn(),
  completeOAuth: vi.fn(),
  checkAuthState: vi.fn().mockResolvedValue(false),
  signOut: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    useAuthStore.setState({ isSignedIn: false, username: null });
  });

  it('should render the app title', () => {
    render(<App />, { wrapper: createQueryWrapper() });
    expect(screen.getByText('InfraBooth Downloader')).toBeDefined();
  });

  it('should render the URL input section', () => {
    render(<App />, { wrapper: createQueryWrapper() });
    expect(screen.getByPlaceholderText('Paste a SoundCloud playlist or track URL')).toBeInTheDocument();
  });

  it('should render sign-in button when not authenticated', () => {
    render(<App />, { wrapper: createQueryWrapper() });
    expect(screen.getByRole('button', { name: 'Sign in with SoundCloud' })).toBeInTheDocument();
  });
});
