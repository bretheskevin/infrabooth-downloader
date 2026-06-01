import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchListShell } from '../components/SearchListShell';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('@/lib/tauri', () => ({
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

const defaultProps = {
  hasSearched: true,
  isLoading: false,
  error: null,
  resultsCount: 2,
  emptyStateMessage: 'Search for something',
  noResultsMessage: 'No results',
  fallbackErrorMessage: 'Something went wrong',
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
};

describe('SearchListShell', () => {
  it('renders children in a plain div', () => {
    const { container } = render(
      <SearchListShell {...defaultProps}>
        <div data-testid="child">Item</div>
      </SearchListShell>,
    );
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toBe('');
  });

  it('does not apply grid classes to non-results states', () => {
    render(
      <SearchListShell {...defaultProps} hasSearched={false}>
        <div>Item</div>
      </SearchListShell>,
    );
    const emptyState = screen.getByText('Search for something');
    expect(emptyState.closest('div')?.className).not.toContain('grid');
  });
});
