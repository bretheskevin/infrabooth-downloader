import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryFilterChips } from '../LibraryFilterChips';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'library.filterAll': 'All',
        'library.filterMine': 'Mine',
        'library.filterLiked': 'Liked',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('LibraryFilterChips', () => {
  it('renders all three chip options', () => {
    render(<LibraryFilterChips active="all" onChange={vi.fn()} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Mine')).toBeInTheDocument();
    expect(screen.getByText('Liked')).toBeInTheDocument();
  });

  it('highlights the active chip', () => {
    render(<LibraryFilterChips active="mine" onChange={vi.fn()} />);
    const mineButton = screen.getByText('Mine').closest('button')!;
    expect(mineButton.className).toContain('bg-primary');
  });

  it('calls onChange when a chip is clicked', () => {
    const onChange = vi.fn();
    render(<LibraryFilterChips active="all" onChange={onChange} />);
    fireEvent.click(screen.getByText('Liked'));
    expect(onChange).toHaveBeenCalledWith('liked');
  });
});
