import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { WebviewSendStatusEvent } from '@/bindings';

const TOAST_ID = 'webview-send';

/**
 * Shows a loading toast while a write (like, follow, comment, message, …) is
 * replayed through the WebView DataDome fallback, which is much slower than the
 * direct API path and may surface a captcha window.
 */
export function useWebviewSendToast() {
  const { t } = useTranslation();

  useEffect(() => {
    const unlisten = listen<WebviewSendStatusEvent>('webview-send-status', ({ payload }) => {
      if (payload.active) {
        toast.loading(t('common.syncingWithSoundcloud'), { id: TOAST_ID });
      } else {
        toast.dismiss(TOAST_ID);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [t]);
}
