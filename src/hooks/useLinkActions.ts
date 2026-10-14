import { useCallback } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';

export function useLinkActions(permalinkUrl: string) {
  const { t } = useTranslation();

  const handleCopyLink = useCallback(async () => {
    if (await copyToClipboard(permalinkUrl, 'useLinkActions')) {
      toast.success(t('trackMenu.linkCopied'));
    } else {
      toast.error(t('common.copyFailed'));
    }
  }, [permalinkUrl, t]);

  const handleOpenInBrowser = useCallback(() => {
    void open(permalinkUrl);
  }, [permalinkUrl]);

  return { handleCopyLink, handleOpenInBrowser };
}
