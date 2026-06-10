import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Are you sure?',
    description: 'This cannot be undone.',
    onConfirm: vi.fn(),
    ...props,
  };

  return {
    ...render(<ConfirmDialog {...defaultProps} />),
    props: defaultProps,
  };
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and description when open', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: 'Are you sure?' })).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('heading', { name: 'Are you sure?' })).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });
    const confirmBtn = screen.getByRole('button', { name: 'common.confirm' });
    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('uses default labels common.cancel and common.confirm when not provided', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.confirm' })).toBeInTheDocument();
  });

  it('uses custom labels when provided', () => {
    renderDialog({ confirmLabel: 'Delete', cancelLabel: 'No thanks' });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No thanks' })).toBeInTheDocument();
  });

  it('disables confirm and cancel buttons when isLoading is true', () => {
    renderDialog({ isLoading: true });
    expect(screen.getByRole('button', { name: /common\.confirm/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
  });

  it('shows spinner icon when isLoading is true', () => {
    renderDialog({ isLoading: true });
    const confirmBtn = screen.getByRole('button', { name: /common\.confirm/ });
    const svg = confirmBtn.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
