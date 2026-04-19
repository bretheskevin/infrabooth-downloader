import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrackInfo, ExportResult } from '@/bindings';
import type { TrackStatus } from '../hooks/useRekordboxExport';
import { ExportToRekordboxButton } from '../components/ExportToRekordboxButton';

const mockOpenConfirm = vi.fn();
const mockStartExport = vi.fn();
const mockClose = vi.fn();

type ExportPhase = 'idle' | 'confirm' | 'exporting' | 'complete' | 'error';

let hookReturn = {
  phase: 'idle' as ExportPhase,
  trackStatuses: new Map<string, TrackStatus>(),
  totalTracks: 0,
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
      if (key === 'rekordboxExport.summaryLine') return `${opts?.exported} exported · ${opts?.skipped} skipped · ${opts?.errors} errors`;
      if (key === 'rekordboxExport.pendingCount') return `${opts?.count} tracks waiting...`;
      if (key === 'rekordboxExport.moreCount') return `+ ${opts?.count} more`;
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

function makeTrackStatus(id: string, title: string, status: TrackStatus['status'], error?: string): TrackStatus {
  return { trackId: id, trackTitle: title, status, error };
}

describe('ExportToRekordboxButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookReturn = {
      phase: 'idle', trackStatuses: new Map(), totalTracks: 0,
      result: null, errorCode: null, error: null,
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

  it('shows downloading phase sections during download', () => {
    hookReturn.phase = 'exporting';
    hookReturn.totalTracks = 5;
    hookReturn.trackStatuses = new Map([
      ['1', makeTrackStatus('1', 'Track A', 'downloading')],
      ['2', makeTrackStatus('2', 'Track B', 'downloading')],
      ['3', makeTrackStatus('3', 'Track C', 'downloaded')],
      ['4', makeTrackStatus('4', 'Track D', 'pending')],
      ['5', makeTrackStatus('5', 'Track E', 'pending')],
    ]);
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('downloadingTracks')).toBeInTheDocument();
    expect(screen.getByText(/sectionDownloading/)).toBeInTheDocument();
    expect(screen.getByText('Track A')).toBeInTheDocument();
    expect(screen.getByText('Track B')).toBeInTheDocument();
    expect(screen.getByText(/sectionDownloaded/)).toBeInTheDocument();
    expect(screen.getByText('Track C')).toBeInTheDocument();
    expect(screen.getByText('2 tracks waiting...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows registering phase sections during registration', () => {
    hookReturn.phase = 'exporting';
    hookReturn.totalTracks = 3;
    hookReturn.trackStatuses = new Map([
      ['1', makeTrackStatus('1', 'Track A', 'completed')],
      ['2', makeTrackStatus('2', 'Track B', 'exporting')],
      ['3', makeTrackStatus('3', 'Track C', 'downloaded')],
    ]);
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('registeringTracks')).toBeInTheDocument();
    expect(screen.getByText(/sectionRegistering/)).toBeInTheDocument();
    expect(screen.getByText('Track B')).toBeInTheDocument();
    expect(screen.getByText(/sectionCompleted/)).toBeInTheDocument();
    expect(screen.getByText('Track A')).toBeInTheDocument();
  });

  it('shows phase-grouped completion view', () => {
    hookReturn.phase = 'complete';
    hookReturn.totalTracks = 3;
    hookReturn.result = { exportedCount: 2, skippedCount: 0, playlistName: 'My Playlist', errors: ['Track C: download failed'] };
    hookReturn.trackStatuses = new Map([
      ['1', makeTrackStatus('1', 'Track A', 'completed')],
      ['2', makeTrackStatus('2', 'Track B', 'completed')],
      ['3', makeTrackStatus('3', 'Track C', 'error', 'download failed')],
    ]);
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('2 exported · 0 skipped · 1 errors')).toBeInTheDocument();
    expect(screen.getByText(/sectionErrors/)).toBeInTheDocument();
    expect(screen.getByText('Track C')).toBeInTheDocument();
    expect(screen.getByText('download failed')).toBeInTheDocument();
    expect(screen.getByText(/sectionCompleted/)).toBeInTheDocument();
    expect(screen.getByText('close')).toBeInTheDocument();
  });

  it('shows completion view without errors section when no errors', () => {
    hookReturn.phase = 'complete';
    hookReturn.totalTracks = 2;
    hookReturn.result = { exportedCount: 2, skippedCount: 0, playlistName: 'My Playlist', errors: [] };
    hookReturn.trackStatuses = new Map([
      ['1', makeTrackStatus('1', 'Track A', 'completed')],
      ['2', makeTrackStatus('2', 'Track B', 'completed')],
    ]);
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.queryByText(/sectionErrors/)).not.toBeInTheDocument();
    expect(screen.getByText(/sectionCompleted/)).toBeInTheDocument();
  });

  it('truncates completed tracks with moreCount', () => {
    hookReturn.phase = 'complete';
    hookReturn.totalTracks = 5;
    hookReturn.result = { exportedCount: 5, skippedCount: 0, playlistName: 'My Playlist', errors: [] };
    hookReturn.trackStatuses = new Map([
      ['1', makeTrackStatus('1', 'Track A', 'completed')],
      ['2', makeTrackStatus('2', 'Track B', 'completed')],
      ['3', makeTrackStatus('3', 'Track C', 'completed')],
      ['4', makeTrackStatus('4', 'Track D', 'completed')],
      ['5', makeTrackStatus('5', 'Track E', 'completed')],
    ]);
    render(<ExportToRekordboxButton tracks={[mockTrack]} playlistName="My Playlist" />);
    expect(screen.getByText('+ 2 more')).toBeInTheDocument();
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
