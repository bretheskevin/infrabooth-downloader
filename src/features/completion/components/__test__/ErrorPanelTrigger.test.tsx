import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ErrorPanelTrigger } from '../ErrorPanelTrigger';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'completion.tracksNeedAttention') {
        const count = options?.count ?? 0;
        return count === 1
          ? '1 track needs attention'
          : `${count} tracks need attention`;
      }
      if (key === 'completion.retryAll') return 'Retry All';
      if (key === 'completion.viewFailed') return 'View details';
      if (key === 'errors.closePanel') return 'Close panel';
      return key;
    },
  }),
}));

describe('ErrorPanelTrigger', () => {
  it('should render nothing when failedCount is 0', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ErrorPanelTrigger failedCount={0} onClick={onClick} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render alert when failedCount is greater than 0', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={3} onClick={onClick} />);
    expect(screen.getByText('3 tracks need attention')).toBeInTheDocument();
  });

  it('should render singular text for 1 failed track', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={1} onClick={onClick} />);
    expect(screen.getByText('1 track needs attention')).toBeInTheDocument();
  });

  it('should render warning icon', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);
    const icon = document.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('should call onClick when view details is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    const viewButton = screen.getByRole('button', { name: /view details/i });
    await user.click(viewButton);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should have aria-expanded attribute on view details button', () => {
    const onClick = vi.fn();
    render(
      <ErrorPanelTrigger failedCount={2} onClick={onClick} isExpanded={false} />
    );

    const viewButton = screen.getByRole('button', { name: /view details/i });
    expect(viewButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should reflect expanded state in aria-expanded', () => {
    const onClick = vi.fn();
    render(
      <ErrorPanelTrigger failedCount={2} onClick={onClick} isExpanded={true} />
    );

    const viewButton = screen.getByRole('button', { name: /close panel/i });
    expect(viewButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have aria-controls attribute linking to panel', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    const viewButton = screen.getByRole('button', { name: /view details/i });
    expect(viewButton).toHaveAttribute('aria-controls', 'error-panel-content');
  });

  it('should use warning color styling on container', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    const textElement = screen.getByText('2 tracks need attention');
    const container = textElement.closest('.border-warning\\/30');
    expect(container).toBeInTheDocument();
  });

  it('should render retry all button when onRetryAll is provided', () => {
    const onClick = vi.fn();
    const onRetryAll = vi.fn();
    render(
      <ErrorPanelTrigger
        failedCount={2}
        onClick={onClick}
        onRetryAll={onRetryAll}
      />
    );

    expect(screen.getByRole('button', { name: /retry all/i })).toBeInTheDocument();
  });

  it('should call onRetryAll when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onRetryAll = vi.fn();
    render(
      <ErrorPanelTrigger
        failedCount={2}
        onClick={onClick}
        onRetryAll={onRetryAll}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry all/i });
    await user.click(retryButton);

    expect(onRetryAll).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should not render retry button when onRetryAll is not provided', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    expect(screen.queryByRole('button', { name: /retry all/i })).not.toBeInTheDocument();
  });

  it('should disable retry button when isRetrying is true', () => {
    const onClick = vi.fn();
    const onRetryAll = vi.fn();
    render(
      <ErrorPanelTrigger
        failedCount={2}
        onClick={onClick}
        onRetryAll={onRetryAll}
        isRetrying={true}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry all/i });
    expect(retryButton).toBeDisabled();
  });
});
