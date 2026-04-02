import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetailViewToolbar } from '../DetailViewToolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sort.recent': 'Recent',
        'sort.popular': 'Popular',
      };
      return map[key] ?? key;
    },
  }),
}));

const SORT_CONFIG = {
  options: [
    { key: 'recent', label: 'sort.recent' },
    { key: 'popular', label: 'sort.popular' },
  ],
  active: 'recent',
  onChange: vi.fn(),
  direction: 'desc' as const,
  onDirectionChange: vi.fn(),
};

describe('DetailViewToolbar', () => {
  it('renders nothing when no sort and no selectable tracks', () => {
    const { container } = render(
      <DetailViewToolbar
        isDownloadEnabled={false}
        hasSelectableTracks={false}
        isAllSelected={false}
        onToggleAll={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders sort chips when sort config provided', () => {
    render(
      <DetailViewToolbar
        isDownloadEnabled={false}
        hasSelectableTracks={false}
        isAllSelected={false}
        onToggleAll={vi.fn()}
        sort={SORT_CONFIG}
      />,
    );
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('calls sort onChange when chip clicked', () => {
    const onChange = vi.fn();
    render(
      <DetailViewToolbar
        isDownloadEnabled={false}
        hasSelectableTracks={false}
        isAllSelected={false}
        onToggleAll={vi.fn()}
        sort={{ ...SORT_CONFIG, onChange }}
      />,
    );
    fireEvent.click(screen.getByText('Popular'));
    expect(onChange).toHaveBeenCalledWith('popular');
  });

  it('renders select-all checkbox when download enabled and has selectable tracks', () => {
    render(
      <DetailViewToolbar
        isDownloadEnabled
        hasSelectableTracks
        isAllSelected={false}
        onToggleAll={vi.fn()}
      />,
    );
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('shows streaming spinner when isStreaming', () => {
    const { container } = render(
      <DetailViewToolbar
        isDownloadEnabled={false}
        hasSelectableTracks={false}
        isAllSelected={false}
        onToggleAll={vi.fn()}
        isStreaming
      />,
    );
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
