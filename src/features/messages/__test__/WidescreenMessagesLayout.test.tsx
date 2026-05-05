import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WidescreenMessagesLayout } from '../components/WidescreenMessagesLayout';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockOpenPage = vi.fn();
const mockClear = vi.fn();

vi.mock('../store', () => ({
  useMessagesStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        selectedConversation: null,
        isPageOpen: true,
      }),
    {
      getState: () => ({
        openPage: mockOpenPage,
        clear: mockClear,
      }),
    },
  ),
}));

vi.mock('../components/ConversationsList', () => ({
  ConversationsList: ({ containerClassName }: { containerClassName?: string }) => (
    <div data-testid="conversations-list" className={containerClassName} />
  ),
}));

vi.mock('../components/ConversationPage', () => ({
  ConversationPage: ({ onBack }: { onBack?: () => void }) => (
    <div data-testid="conversation-page">
      <button data-testid="back-btn" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}));

describe('WidescreenMessagesLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the conversations list pane with title', () => {
    render(<WidescreenMessagesLayout />);
    expect(screen.getByText('directMessages.title')).toBeDefined();
    expect(screen.getByTestId('conversations-list')).toBeDefined();
  });

  it('shows placeholder when no conversation is selected', () => {
    render(<WidescreenMessagesLayout />);
    expect(screen.getByText('directMessages.selectConversation')).toBeDefined();
    expect(screen.queryByTestId('conversation-page')).toBeNull();
  });
});
