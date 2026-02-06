import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserBadge } from './UserBadge';
import { useAuthStore } from '@/stores/authStore';

describe('UserBadge', () => {
  beforeEach(() => {
    // Reset store to default state
    useAuthStore.setState({ isSignedIn: false, username: null });
  });

  it('should display username when available', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser' });

    render(<UserBadge />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should display fallback text when username is null', () => {
    useAuthStore.setState({ isSignedIn: true, username: null });

    render(<UserBadge />);

    expect(screen.getByText('Signed in')).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    useAuthStore.setState({ isSignedIn: true, username: 'testuser' });

    render(<UserBadge />);

    const badge = screen.getByText('testuser');
    expect(badge).toHaveClass('text-sm');
    expect(badge).toHaveClass('text-muted-foreground');
  });
});
