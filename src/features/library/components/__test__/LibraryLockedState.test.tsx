import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibraryLockedState } from '../LibraryLockedState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'library.lockedTitle': 'Sign in to access your library',
        'library.lockedDescription': 'Browse and download your SoundCloud playlists',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('LibraryLockedState', () => {
  it('renders locked title and description', () => {
    render(<LibraryLockedState />);
    expect(screen.getByText('Sign in to access your library')).toBeInTheDocument();
    expect(screen.getByText('Browse and download your SoundCloud playlists')).toBeInTheDocument();
  });
});
