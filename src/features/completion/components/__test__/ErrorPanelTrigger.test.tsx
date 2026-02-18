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

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should have aria-expanded attribute', () => {
    const onClick = vi.fn();
    render(
      <ErrorPanelTrigger failedCount={2} onClick={onClick} isExpanded={false} />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should reflect expanded state in aria-expanded', () => {
    const onClick = vi.fn();
    render(
      <ErrorPanelTrigger failedCount={2} onClick={onClick} isExpanded={true} />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have aria-controls attribute linking to panel', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-controls', 'error-panel-content');
  });

  it('should use warning color styling on container', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    const textElement = screen.getByText('2 tracks need attention');
    const container = textElement.closest('.border-warning\\/30');
    expect(container).toBeInTheDocument();
  });

  it('should be a single clickable button', () => {
    const onClick = vi.fn();
    render(<ErrorPanelTrigger failedCount={2} onClick={onClick} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });
});
