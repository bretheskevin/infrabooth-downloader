import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FilterChips } from '../FilterChips';
import { TranslationProvider } from '@/lib/translation';

const tFn = (key: string) => {
  const map: Record<string, string> = {
    'filter.all': 'All',
    'filter.new': 'New',
    'filter.reposted': 'Reposted',
  };
  return map[key] ?? key;
};

function Wrapper({ children }: { children: ReactNode }) {
  return <TranslationProvider t={tFn}>{children}</TranslationProvider>;
}

const OPTIONS = [
  { key: 'all' as const, label: 'filter.all' },
  { key: 'new' as const, label: 'filter.new' },
  { key: 'reposted' as const, label: 'filter.reposted' },
];

describe('FilterChips', () => {
  it('renders all options', () => {
    render(<FilterChips options={OPTIONS} active="all" onChange={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Reposted')).toBeInTheDocument();
  });

  it('highlights the active chip with default variant', () => {
    render(<FilterChips options={OPTIONS} active="new" onChange={vi.fn()} />, { wrapper: Wrapper });
    const newBtn = screen.getByText('New').closest('button')!;
    const allBtn = screen.getByText('All').closest('button')!;
    expect(newBtn.className).not.toEqual(allBtn.className);
  });

  it('calls onChange when a chip is clicked', () => {
    const onChange = vi.fn();
    render(<FilterChips options={OPTIONS} active="all" onChange={onChange} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Reposted'));
    expect(onChange).toHaveBeenCalledWith('reposted');
  });
});
