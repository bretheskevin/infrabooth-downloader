import { useEffect } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { DownloadProgressEvent } from '@/bindings';

export type ProgressCallback = (event: DownloadProgressEvent) => void;

export function useDownloadProgressListener(onProgress: ProgressCallback) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setup = async () => {
      unlisten = await listen<DownloadProgressEvent>(
        'download-progress',
        (event) => onProgress(event.payload)
      );
    };

    void setup();
    return () => { unlisten?.(); };
  }, [onProgress]);
}
