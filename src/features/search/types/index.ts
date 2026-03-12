export type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error';

export interface DownloadState {
  status: DownloadStatus;
  progress?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string;
}
