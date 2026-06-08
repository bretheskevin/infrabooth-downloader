import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPlayerState = { railTab: 'queue' as 'queue' | 'comments' };
const mockSetRailTab = vi.fn();

vi.mock('../store', () => ({
  usePlayerStore: Object.assign((selector: (s: typeof mockPlayerState) => unknown) => selector(mockPlayerState), {
    getState: () => ({ setRailTab: mockSetRailTab }),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'comments.tabQueue': 'Queue',
        'comments.tabComments': 'Comments',
      };
      return map[key] ?? key;
    },
  }),
}));

import { RailTabToggle } from '../components/RailTabToggle';

describe('RailTabToggle', () => {
  beforeEach(() => {
    mockPlayerState.railTab = 'queue';
    mockSetRailTab.mockClear();
  });

  it('renders queue and comments tab triggers', () => {
    render(<RailTabToggle />);
    expect(screen.getByText('Queue')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('has queue tab active by default', () => {
    render(<RailTabToggle />);
    const queueTab = screen.getByText('Queue');
    expect(queueTab).toHaveAttribute('data-state', 'active');
  });

  it('calls setRailTab when comments tab is clicked', async () => {
    const user = userEvent.setup();
    render(<RailTabToggle />);
    await user.click(screen.getByText('Comments'));
    expect(mockSetRailTab).toHaveBeenCalledWith('comments');
  });

  it('has comments tab active when railTab is comments', () => {
    mockPlayerState.railTab = 'comments';
    render(<RailTabToggle />);
    const commentsTab = screen.getByText('Comments');
    expect(commentsTab).toHaveAttribute('data-state', 'active');
  });
});
