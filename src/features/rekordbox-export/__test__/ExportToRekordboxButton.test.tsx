import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrackInfo, RekordboxExportProgressEvent, ExportResult } from '@/bindings';
import { ExportToRekordboxButton } from '../components/ExportToRekordboxButton';

const mockOpenConfirm = vi.fn();
const mockStartExport = vi.fn();
const mockClose = vi.fn();

type ExportPhase = 'idle' | 'confirm' | 'exporting' | 'complete' | 'error';

let hookReturn = {
  phase: 'idle' as ExportPhase,
  progress: null as RekordboxExportProgressEvent | null,
  result: null as ExportResult | null,
  errorCode: null as string | null,
  error: null as string | null,
  openConfirm: mockOpenConfirm,
  startExport: mockStartExport,
  close: mockClose,
};

vi.mock('../hooks/useRekordboxExport', () => ({
  useRekordboxExport: () => hookReturn,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'rekordboxExport.confirmMessage') return `Export ${opts?.count} tracks as "${opts?.playlist}"?`;
      if (key === 'rekordboxExport.summary') return `${opts?.exported} exported, ${opts?.skipped} skipped, ${opts?.errors} errors`;
      const parts = key.split('.');
      return parts[parts.length - 1];
    },
  }),
}));

const mockTrack: TrackInfo = {
  id: 1,
  title: 'Test Track',
  user: { id: 42, username: 'TestArtist', avatar_url: null },
  artwork_url: null,
  duration: 180000,
  permalink_url: 'https://soundcloud.com/testartist/test-track',
  waveform_url: null,
  downloadable: false,
  download_url: null,
};

describe('ExportToRekordboxButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookReturn = {
      phase: 'idle', progress: null, result: null, errorCode: null, error: null,
      openConfirm: mockOpenConfirm, startExport: mockStartExport, close: mockClose,
    };
  });

  it('renders the button', () => {
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('button')).toBeInTheDocument();
  });

  it('disables button when no tracks', () => {
    render(<ExportToRekordboxButton tracks={[]} playlistName="My Playlist" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls openConfirm on click', async () => {
    const user = userEvent.setup();
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    await user.click(screen.getByRole('button'));
    expect(mockOpenConfirm).toHaveBeenCalledOnce();
  });

  it('shows confirm dialog with track count', () => {
    hookReturn.phase = 'confirm';
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('Export 1 tracks as "My Playlist"?')).toBeInTheDocument();
    expect(screen.getByText('start')).toBeInTheDocument();
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  it('calls startExport when export button clicked', async () => {
    const user = userEvent.setup();
    hookReturn.phase = 'confirm';
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    await user.click(screen.getByText('start'));
    expect(mockStartExport).toHaveBeenCalledOnce();
  });

  it('shows progress during export', () => {
    hookReturn.phase = 'exporting';
    hookReturn.progress = { trackId: '1', trackTitle: 'Test Track', status: 'downloading', currentTrack: 1, totalTracks: 3, error: null };
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText(/Test Track/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows completion summary', () => {
    hookReturn.phase = 'complete';
    hookReturn.result = { exportedCount: 2, skippedCount: 1, playlistName: 'My Playlist', errors: [] };
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('2 exported, 1 skipped, 0 errors')).toBeInTheDocument();
    expect(screen.getByText('close')).toBeInTheDocument();
  });

  it('shows errors in completion view', () => {
    hookReturn.phase = 'complete';
    hookReturn.result = { exportedCount: 0, skippedCount: 0, playlistName: 'My Playlist', errors: ['Track failed: network error'] };
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('Track failed: network error')).toBeInTheDocument();
  });

  it('shows translated error for REKORDBOX_RUNNING code', () => {
    hookReturn.phase = 'error';
    hookReturn.errorCode = 'REKORDBOX_RUNNING';
    hookReturn.error = 'Rekordbox is running — close it before making changes';
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('rekordboxRunning')).toBeInTheDocument();
  });

  it('shows translated fallback for unknown error codes', () => {
    hookReturn.phase = 'error';
    hookReturn.errorCode = 'UNKNOWN';
    hookReturn.error = 'Something unexpected happened';
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('error')).toBeInTheDocument();
  });
});
