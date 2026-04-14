import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { api } from '@/lib/tauri';
import { useSettingsStore } from '@/features/settings/store';
import { RekordboxPathPicker } from './RekordboxPathPicker';

type DetectionResult = { found: true; isRunning: boolean } | { found: false };

const STATUS_BADGE_CONFIG = {
  running: { icon: AlertCircle, labelKey: 'settings.rekordboxRunningBadge', className: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  found: { icon: CheckCircle2, labelKey: 'settings.rekordboxFound', className: 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400' },
  notFound: { icon: AlertCircle, labelKey: 'settings.rekordboxNotFoundBadge', className: 'border-destructive/20 bg-destructive/10 text-destructive' },
} as const;

function StatusBadge({ variant }: { variant: keyof typeof STATUS_BADGE_CONFIG }) {
  const { t } = useTranslation();
  const { icon: Icon, labelKey, className } = STATUS_BADGE_CONFIG[variant];
  return (
    <Badge variant="outline" className={cn('w-fit gap-1', className)}>
      <Icon className="h-3.5 w-3.5" />
      {t(labelKey)}
    </Badge>
  );
}

function getStatusVariant(result: DetectionResult | undefined): keyof typeof STATUS_BADGE_CONFIG | null {
  if (!result) return null;
  if (result.found && result.isRunning) return 'running';
  if (result.found) return 'found';
  return 'notFound';
}

export function RekordboxSettings() {
  const { t } = useTranslation();
  const rekordboxPathOverride = useSettingsStore((s) => s.rekordboxPathOverride);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rekordbox-status', rekordboxPathOverride],
    queryFn: async (): Promise<DetectionResult> => {
      const result = await api.detectRekordbox(rekordboxPathOverride || undefined);
      if (result.found) return { found: true, isRunning: result.isRunning };
      return { found: false };
    },
    retry: false,
  });

  const statusVariant = getStatusVariant(data);

  function handleClearOverride() {
    useSettingsStore.getState().setRekordboxPathOverride('');
    void refetch();
  }

  return (
    <div className="space-y-6" data-testid="rekordbox-settings">
      <div className="space-y-1">
        <div className="flex items-center gap-2" data-testid="rekordbox-header">
          <h2 className="text-lg font-semibold">{t('settings.categoryRekordbox')}</h2>
          {statusVariant && <StatusBadge variant={statusVariant} />}
        </div>
        <p className="text-sm text-muted-foreground">{t('settings.rekordboxDescription')}</p>
        {statusVariant === 'running' && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{t('settings.rekordboxRunning')}</p>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('settings.rekordboxLoading')}</p>
      )}

      {isError && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-destructive">{t('settings.rekordboxUnexpectedError')}</p>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            {t('settings.rekordboxRetry')}
          </Button>
        </div>
      )}

      {data && !data.found && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-base font-medium">{t('settings.rekordboxManualLabel')}</Label>
            <p className="text-sm text-muted-foreground">{t('settings.rekordboxNotFound')}</p>
          </div>
          <RekordboxPathPicker onPicked={() => void refetch()} />
        </div>
      )}

      {data?.found && rekordboxPathOverride && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-base font-medium">{t('settings.rekordboxCustomPathLabel')}</Label>
            <p className="truncate text-sm text-muted-foreground">{rekordboxPathOverride}</p>
          </div>
          <div className="flex items-center gap-2">
            <RekordboxPathPicker onPicked={() => void refetch()} />
            <Button variant="ghost" size="sm" onClick={handleClearOverride}>
              {t('settings.rekordboxClearOverride')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
