import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhatsNewDialog } from '../WhatsNewDialog';
import type { ChangelogEntry, ChangelogSection } from '../../utils/parseChangelog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'changelog.whatsNew': `What's new in v${String(opts?.version ?? '')}`,
        'changelog.whatsNewSince': `What's new since v${String(opts?.version ?? '')}`,
        'changelog.updateCount': `${String(opts?.count ?? '')} updates`,
        'changelog.released': `Released ${String(opts?.date ?? '')}`,
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

const single = (date: string | null, sections: ChangelogSection[] = mockSections): ChangelogEntry[] => [
  { version: '1.6.0', date, sections },
];

const multi: ChangelogEntry[] = [
  { version: '1.6.0', date: '2026-03-11', sections: [{ category: 'added', items: ['Newest feature'] }] },
  { version: '1.5.0', date: '2026-03-01', sections: [{ category: 'fixed', items: ['Older fix'] }] },
  { version: '1.4.0', date: null, sections: [{ category: 'changed', items: ['Oldest change'] }] },
];

describe('WhatsNewDialog — single version', () => {
  it('renders the current version title', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.5.0" entries={single('2026-03-11')} />);
    expect(screen.getByText("What's new in v1.6.0")).toBeInTheDocument();
    expect(screen.queryByText(/What's new since/)).not.toBeInTheDocument();
  });

  it('shows the release date as description', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.5.0" entries={single('2026-03-11')} />);
    expect(screen.getByText(/^Released /)).toBeInTheDocument();
  });

  it('shows the fallback description when date is null', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.5.0" entries={single(null)} />);
    expect(screen.getByText('Version history and release notes')).toBeInTheDocument();
  });

  it('renders the changelog sections', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.5.0" entries={single(null)} />);
    expect(screen.getByText('New feature')).toBeInTheDocument();
    expect(screen.getByText('Bug fix')).toBeInTheDocument();
  });

  it('calls onDismiss when "Got it" is clicked', async () => {
    const onDismiss = vi.fn();
    render(<WhatsNewDialog open onDismiss={onDismiss} previousVersion="1.5.0" entries={single(null)} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Got it' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not render when open is false', () => {
    render(<WhatsNewDialog open={false} onDismiss={() => {}} previousVersion="1.5.0" entries={single(null)} />);
    expect(screen.queryByText("What's new in v1.6.0")).not.toBeInTheDocument();
  });

  it('still renders title and button when sections are empty', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.5.0" entries={single(null, [])} />);
    expect(screen.getByText("What's new in v1.6.0")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
  });
});

describe('WhatsNewDialog — multiple versions', () => {
  it('renders the "since" title and the update count', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.3.0" entries={multi} />);
    expect(screen.getByText("What's new since v1.3.0")).toBeInTheDocument();
    expect(screen.getByText('3 updates')).toBeInTheDocument();
    expect(screen.queryByText("What's new in v1.6.0")).not.toBeInTheDocument();
  });

  it('renders every version header in the given order', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.3.0" entries={multi} />);
    const headers = screen.getAllByText(/^v\d+\.\d+\.\d+$/).map((el) => el.textContent);
    expect(headers).toEqual(['v1.6.0', 'v1.5.0', 'v1.4.0']);
  });

  it('renders the formatted date next to versions that have one', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.3.0" entries={multi} />);
    expect(screen.getByText('· March 11, 2026')).toBeInTheDocument();
    expect(screen.getByText('· March 1, 2026')).toBeInTheDocument();
    expect(screen.getAllByText(/^· /)).toHaveLength(2);
  });

  it('renders the notes of every version expanded', () => {
    render(<WhatsNewDialog open onDismiss={() => {}} previousVersion="1.3.0" entries={multi} />);
    expect(screen.getByText('Newest feature')).toBeInTheDocument();
    expect(screen.getByText('Older fix')).toBeInTheDocument();
    expect(screen.getByText('Oldest change')).toBeInTheDocument();
  });

  it('calls onDismiss when "Got it" is clicked', async () => {
    const onDismiss = vi.fn();
    render(<WhatsNewDialog open onDismiss={onDismiss} previousVersion="1.3.0" entries={multi} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Got it' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
