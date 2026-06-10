import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentRow } from '../components/CommentRow';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

vi.mock('@/features/artist-profile/store', () => ({
  useArtistProfileStore: { getState: () => ({ openProfile: vi.fn() }) },
}));

vi.mock('@/features/player/store', () => ({
  usePlayerStore: { getState: () => ({ seek: vi.fn() }) },
}));

vi.mock('@/lib/linkify', () => ({
  linkifyText: (text: string) => text,
}));

const makeComment = (overrides: Partial<{ id: number; userId: number }> = {}) => ({
  id: overrides.id ?? 1,
  body: 'Test comment',
  createdAt: '2026-01-15T10:00:00Z',
  timestampMs: 5000,
  user: {
    id: overrides.userId ?? 100,
    username: 'testuser',
    avatar_url: null,
    permalink: 'testuser',
    permalink_url: 'https://soundcloud.com/testuser',
  },
});

describe('CommentRow delete button', () => {
  it('hides delete when no currentUserId', () => {
    render(<CommentRow comment={makeComment()} onDelete={() => {}} />);
    expect(screen.queryByRole('button', { name: 'comments.delete' })).not.toBeInTheDocument();
  });
  it('hides delete when not author nor track owner', () => {
    render(<CommentRow comment={makeComment({ userId: 100 })} onDelete={() => {}} currentUserId={999} trackArtistId={888} />);
    expect(screen.queryByRole('button', { name: 'comments.delete' })).not.toBeInTheDocument();
  });
  it('shows delete when author', () => {
    render(<CommentRow comment={makeComment({ userId: 100 })} onDelete={() => {}} currentUserId={100} />);
    expect(screen.getByRole('button', { name: 'comments.delete' })).toBeInTheDocument();
  });
  it('shows delete when track owner', () => {
    render(<CommentRow comment={makeComment({ userId: 100 })} onDelete={() => {}} currentUserId={200} trackArtistId={200} />);
    expect(screen.getByRole('button', { name: 'comments.delete' })).toBeInTheDocument();
  });
  it('confirms and calls onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const { container } = render(<CommentRow comment={makeComment({ id: 42, userId: 100 })} onDelete={onDelete} currentUserId={100} />);
    await user.click(screen.getByRole('button', { name: 'comments.delete' }));
    expect(screen.getByText('comments.deleteConfirmTitle')).toBeInTheDocument();
    const dialogButtons = screen.getAllByRole('button', { name: 'comments.delete' });
    const confirmButton = dialogButtons[dialogButtons.length - 1];
    if (!confirmButton) throw new Error('Confirm button not found');
    await user.click(confirmButton);

    const row = container.querySelector('.comment-row-exit');
    if (!row) throw new Error('Exit animation not applied');
    fireEvent.animationEnd(row);
    expect(onDelete).toHaveBeenCalledWith(42);
  });
});
