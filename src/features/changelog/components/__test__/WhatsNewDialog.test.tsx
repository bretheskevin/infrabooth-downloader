import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsNewDialog } from '../WhatsNewDialog';
import type { ChangelogSection } from '../../utils/parseChangelog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'changelog.whatsNew': `What's new in v${opts?.version ?? ''}`,
        'changelog.released': `Released ${opts?.date ?? ''}`,
        'changelog.description': 'Version history and release notes',
        'changelog.gotIt': 'Got it',
        'changelog.added': 'Added',
        'changelog.changed': 'Changed',
        'changelog.fixed': 'Fixed',
        'changelog.removed': 'Removed',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

const mockSections: ChangelogSection[] = [
  { category: 'added', items: ['New feature'] },
  { category: 'fixed', items: ['Bug fix'] },
];

describe('WhatsNewDialog', () => {
  it('should render dialog when open', () => {
    render(<WhatsNewDialog open={true} onDismiss={() => {}} version="1.6.0" date="2026-03-11" sections={mockSections} />);
    expect(screen.getByText("What's new in v1.6.0")).toBeInTheDocument();
  });

  it('should show release date as description', () => {
    render(<WhatsNewDialog open={true} onDismiss={() => {}} version="1.6.0" date="2026-03-11" sections={mockSections} />);
    // Date is formatted via Intl.DateTimeFormat with dateStyle: 'long'
    expect(screen.getByText(/^Released /)).toBeInTheDocument();
  });

  it('should show fallback description when date is null', () => {
    render(<WhatsNewDialog open={true} onDismiss={() => {}} version="1.6.0" date={null} sections={mockSections} />);
    expect(screen.getByText('Version history and release notes')).toBeInTheDocument();
  });

  it('should render changelog sections', () => {
    render(<WhatsNewDialog open={true} onDismiss={() => {}} version="1.6.0" date={null} sections={mockSections} />);
    expect(screen.getByText('New feature')).toBeInTheDocument();
    expect(screen.getByText('Bug fix')).toBeInTheDocument();
  });

  it('should call onDismiss when "Got it" is clicked', () => {
    const onDismiss = vi.fn();
    render(<WhatsNewDialog open={true} onDismiss={onDismiss} version="1.6.0" date={null} sections={mockSections} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should not render when open is false', () => {
    render(<WhatsNewDialog open={false} onDismiss={() => {}} version="1.6.0" date={null} sections={mockSections} />);
    expect(screen.queryByText("What's new in v1.6.0")).not.toBeInTheDocument();
  });

  it('should show generic message when sections is empty', () => {
    render(<WhatsNewDialog open={true} onDismiss={() => {}} version="1.6.0" date={null} sections={[]} />);
    expect(screen.getByText("What's new in v1.6.0")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
  });
});
