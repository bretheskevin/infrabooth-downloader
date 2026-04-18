import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, History, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/tauri';
import { formatBackupRelativeTime, formatBackupAbsoluteDate } from '@/features/settings/helpers';
import type { BackupInfo } from '@/bindings';

function BackupEntry({
  backup,
  locale,
  onRestore,
  disabled,
  isRestoring,
}: {
  backup: BackupInfo;
  locale: string;
  onRestore: (backup: BackupInfo) => void;
  disabled: boolean;
  isRestoring: boolean;
}) {
  const { t } = useTranslation();
  const relativeTime = formatBackupRelativeTime(backup.timestamp, t);
  const absoluteTime = formatBackupAbsoluteDate(backup.timestamp, locale);

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-foreground">{relativeTime}</span>
          </TooltipTrigger>
          <TooltipContent>{absoluteTime}</TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground">&middot;</span>
        <span className="text-muted-foreground">
          {t('settings.backupSize', { size: backup.sizeMb })}
        </span>
        {backup.kind === 'preRestore' && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {t('settings.backupPreRestore')}
          </Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onRestore(backup)}
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        {isRestoring ? t('settings.backupRestoring') : t('settings.backupRestore')}
      </Button>
    </div>
  );
}

export function BackupSection() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isOlderOpen, setIsOlderOpen] = useState(false);
  const [confirmBackup, setConfirmBackup] = useState<BackupInfo | null>(null);

  const { data: backups = [] } = useQuery({
    queryKey: ['rekordbox-backups'],
    queryFn: () => api.listRekordboxBackups(),
  });

  const restoreMutation = useMutation({
    mutationFn: (backupPath: string) => api.restoreRekordboxBackup(backupPath),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rekordbox-backups'] });
      toast.success(t('settings.backupRestoreSuccess'), {
        description: t('settings.backupRestoreSuccessHint'),
      });
    },
    onError: (err) => {
      const isRunning = err instanceof ApiError && err.code === 'REKORDBOX_RUNNING';
      if (isRunning) {
        void queryClient.invalidateQueries({ queryKey: ['rekordbox-status'] });
      }
      const description = isRunning
        ? t('settings.rekordboxRunning')
        : err instanceof Error ? err.message : String(err);
      toast.error(t('settings.backupRestoreError'), { description });
    },
    onSettled: () => setConfirmBackup(null),
  });

  function handleRestoreClick(backup: BackupInfo) {
    setConfirmBackup(backup);
  }

  function handleConfirmRestore() {
    if (!confirmBackup) return;
    restoreMutation.mutate(confirmBackup.path);
  }

  const sortedBackups = [...backups].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const latestBackup = sortedBackups[0];
  const olderBackups = sortedBackups.slice(1);

  const confirmRelativeTime = confirmBackup
    ? formatBackupRelativeTime(confirmBackup.timestamp, t)
    : '';

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-medium">{t('settings.backupsTitle')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('settings.backupsDescription')}</p>
      </div>

      {sortedBackups.length === 0 && (
        <p className="text-sm text-muted-foreground italic">{t('settings.backupsEmpty')}</p>
      )}

      {latestBackup && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('settings.backupsLatest')}
          </p>
          <BackupEntry
            backup={latestBackup}
            locale={i18n.language}
            onRestore={handleRestoreClick}
            disabled={restoreMutation.isPending}
            isRestoring={restoreMutation.isPending && confirmBackup?.path === latestBackup.path}
          />
        </div>
      )}

      {olderBackups.length > 0 && (
        <Collapsible open={isOlderOpen} onOpenChange={setIsOlderOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto px-0 py-0 gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform', isOlderOpen && 'rotate-90')}
              />
              {isOlderOpen
                ? t('settings.backupsHideOlder')
                : t('settings.backupsShowOlder', { count: olderBackups.length })}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {olderBackups.map((backup) => (
              <BackupEntry
                key={backup.path}
                backup={backup}
                locale={i18n.language}
                onRestore={handleRestoreClick}
                disabled={restoreMutation.isPending}
                isRestoring={restoreMutation.isPending && confirmBackup?.path === backup.path}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <AlertDialog open={confirmBackup !== null} onOpenChange={(open) => { if (!open) setConfirmBackup(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.backupRestoreTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.backupRestoreDescription', { time: confirmRelativeTime })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.backupRestoreCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings.backupRestoreConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
