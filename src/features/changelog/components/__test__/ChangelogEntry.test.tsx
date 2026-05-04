import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChangelogEntry } from '../ChangelogEntry';
import type { ChangelogSection } from '../../utils/parseChangelog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'changelog.added': 'Added',
        'changelog.changed': 'Changed',
        'changelog.fixed': 'Fixed',
        'changelog.removed': 'Removed',
      };
      return translations[key] || key;
    },
  }),
}));

const mockSections: ChangelogSection[] = [
  { category: 'added', items: ['New feature one', 'New feature two'] },
  { category: 'changed', items: ['Updated behavior'] },
  { category: 'fixed', items: ['Bug fix'] },
];

describe('ChangelogEntry', () => {
  it('should render all section categories', () => {
    render(<ChangelogEntry sections={mockSections} />);
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Changed')).toBeInTheDocument();
    expect(screen.getByText('Fixed')).toBeInTheDocument();
  });

  it('should render items within sections', () => {
    render(<ChangelogEntry sections={mockSections} />);
    expect(screen.getByText('New feature one')).toBeInTheDocument();
    expect(screen.getByText('New feature two')).toBeInTheDocument();
    expect(screen.getByText('Updated behavior')).toBeInTheDocument();
    expect(screen.getByText('Bug fix')).toBeInTheDocument();
  });

  it('should render removed category when present', () => {
    const withRemoved: ChangelogSection[] = [{ category: 'removed', items: ['Old feature'] }];
    render(<ChangelogEntry sections={withRemoved} />);
    expect(screen.getByText('Removed')).toBeInTheDocument();
    expect(screen.getByText('Old feature')).toBeInTheDocument();
  });

  it('should not render anything when sections is empty', () => {
    const { container } = render(<ChangelogEntry sections={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
