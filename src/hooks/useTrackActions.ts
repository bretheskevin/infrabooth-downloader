import { useCallback } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function useTrackActions(permalinkUrl: string) {
  const { t } = useTranslation();

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(permalinkUrl);
    toast.success(t('trackMenu.linkCopied'));
  }, [permalinkUrl, t]);

  const handleOpenInBrowser = useCallback(() => {
    void open(permalinkUrl);
  }, [permalinkUrl]);

  return { handleCopyLink, handleOpenInBrowser };
}
