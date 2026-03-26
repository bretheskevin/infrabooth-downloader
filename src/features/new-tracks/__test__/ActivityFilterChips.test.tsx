import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityFilterChips } from '../components/ActivityFilterChips';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'newTracks.filterAll': 'All',
        'newTracks.filterNew': 'New',
        'newTracks.filterReposted': 'Reposted',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('ActivityFilterChips', () => {
  it('renders all three chip options', () => {
    render(<ActivityFilterChips active="all" onChange={vi.fn()} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Reposted')).toBeInTheDocument();
  });

  it('highlights the active chip', () => {
    render(<ActivityFilterChips active="new" onChange={vi.fn()} />);
    const newButton = screen.getByText('New').closest('button')!;
    const allButton = screen.getByText('All').closest('button')!;
    expect(newButton.className).not.toEqual(allButton.className);
  });

  it('calls onChange when a chip is clicked', () => {
    const onChange = vi.fn();
    render(<ActivityFilterChips active="all" onChange={onChange} />);
    fireEvent.click(screen.getByText('Reposted'));
    expect(onChange).toHaveBeenCalledWith('reposted');
  });
});
