import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import type { RemoteServerInfo } from '@/bindings';
import { RemoteControlSettings } from '../components/RemoteControlSettings';
import { useSettingsStore } from '@/features/settings/store';
import { useRemoteStore } from '../store';

const { mockResetRemoteLink } = vi.hoisted(() => ({ mockResetRemoteLink: vi.fn() }));

vi.mock('@/bindings', () => ({
  commands: {
    resetRemoteLink: mockResetRemoteLink,
    startRemoteServer: vi.fn(),
    stopRemoteServer: vi.fn(),
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-qr-code', () => ({ default: ({ value }: { value: string }) => <div data-testid="qr">{value}</div> }));

const oldInfo: RemoteServerInfo = { url: 'http://192.168.1.2:4000/?t=old', port: 4000, token: 'old' };
const newInfo: RemoteServerInfo = { url: 'http://192.168.1.2:5000/?t=new', port: 5000, token: 'new' };

describe('RemoteControlSettings reset link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRemoteStore.setState({ serverInfo: null, starting: false });
    useSettingsStore.setState({ remoteControlEnabled: true });
  });

  it('hides the reset button while the server is stopped', () => {
    render(<RemoteControlSettings />);
    expect(screen.queryByRole('button', { name: 'settings.remote.resetLink' })).toBeNull();
  });

  it('does not reset until the confirmation is accepted', async () => {
    useRemoteStore.setState({ serverInfo: oldInfo });
    render(<RemoteControlSettings />);
    await userEvent.click(screen.getByRole('button', { name: 'settings.remote.resetLink' }));
    expect(mockResetRemoteLink).not.toHaveBeenCalled();
    expect(screen.getByText('settings.remote.resetLinkConfirmTitle')).toBeInTheDocument();
  });

  it('refreshes the shown URL and QR after confirming', async () => {
    mockResetRemoteLink.mockResolvedValue({ status: 'ok', data: newInfo });
    useRemoteStore.setState({ serverInfo: oldInfo });
    render(<RemoteControlSettings />);
    await userEvent.click(screen.getByRole('button', { name: 'settings.remote.resetLink' }));
    await userEvent.click(screen.getByRole('button', { name: 'settings.remote.resetLinkConfirm' }));
    await waitFor(() => expect(screen.getByTestId('qr').textContent).toBe(newInfo.url));
    expect(useRemoteStore.getState().serverInfo).toEqual(newInfo);
  });

  it('drops the invalidated link and shows an error when the reset fails', async () => {
    mockResetRemoteLink.mockResolvedValue({ status: 'error', error: { code: 'REMOTE_ERROR', message: 'boom' } });
    useRemoteStore.setState({ serverInfo: oldInfo });
    render(<RemoteControlSettings />);
    await userEvent.click(screen.getByRole('button', { name: 'settings.remote.resetLink' }));
    await userEvent.click(screen.getByRole('button', { name: 'settings.remote.resetLinkConfirm' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('settings.remote.resetLinkError'));
    expect(useRemoteStore.getState().serverInfo).toBeNull();
    expect(useSettingsStore.getState().remoteControlEnabled).toBe(false);
    expect(screen.queryByTestId('qr')).toBeNull();
  });
});
