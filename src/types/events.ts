/**
 * Download progress event payload received from the Rust backend.
 *
 * Emitted via the `download-progress` event channel during track downloads.
 */
export interface DownloadProgressEvent {
  trackId: string;
  status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed';
  percent?: number;
  error?: {
    code: string;
    message: string;
  };
}
