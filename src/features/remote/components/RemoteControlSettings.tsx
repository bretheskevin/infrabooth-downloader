import { useTranslation } from 'react-i18next';
import { Loader2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/features/settings/store';
import { useRemoteStore } from '../store';

export function RemoteControlSettings() {
  const { t } = useTranslation();
  const remoteControlEnabled = useSettingsStore((s) => s.remoteControlEnabled);
  const serverInfo = useRemoteStore((s) => s.serverInfo);
  const starting = useRemoteStore((s) => s.starting);
  const [copied, setCopied] = useState(false);

  async function handleToggle(enabled: boolean) {
    useSettingsStore.getState().setRemoteControlEnabled(enabled);
    if (enabled) {
      try {
        await useRemoteStore.getState().enable();
      } catch {
        useSettingsStore.getState().setRemoteControlEnabled(false);
        toast.error(t('settings.remote.startError'));
      }
    } else {
      await useRemoteStore.getState().disable();
    }
  }

  async function handleCopyUrl() {
    if (!serverInfo) return;
    await navigator.clipboard.writeText(serverInfo.url);
    setCopied(true);
    toast.success(t('settings.remote.urlCopied'));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('settings.categoryRemote')}</h2>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="remote-control" className="text-base font-medium">
            {t('settings.remote.enable')}
          </Label>
          <p className="text-sm text-muted-foreground">{t('settings.remote.enableDescription')}</p>
        </div>
        {starting ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Switch id="remote-control" checked={remoteControlEnabled} onCheckedChange={(v) => void handleToggle(v)} />
        )}
      </div>

      {serverInfo && (
        <>
          <Separator />
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCode value={serverInfo.url} size={180} />
            </div>
            <div className="flex items-center gap-2 w-full">
              <code className="flex-1 truncate rounded bg-muted px-3 py-1.5 text-xs font-mono">{serverInfo.url}</code>
              <Button variant="outline" size="icon" onClick={() => void handleCopyUrl()} aria-label={t('settings.remote.copyUrl')}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">{t('settings.remote.scanInstructions')}</p>
          </div>
        </>
      )}
    </div>
  );
}
