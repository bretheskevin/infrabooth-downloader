import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ExportPhaseSection } from '../ExportPhaseSection';
import { MAX_VISIBLE_TRACKS, type StatusGroups } from '../../utils/exportGroups';

interface ExportingContentProps {
  groups: StatusGroups;
  totalTracks: number;
  completedCount: number;
  percent: number;
  isRegistering: boolean;
  onCancel: () => void;
}

export function ExportingContent({ groups, totalTracks, completedCount, percent, isRegistering, onCancel }: ExportingContentProps) {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('rekordboxExport.confirmTitle')}</DialogTitle>
        <DialogDescription>
          {isRegistering ? t('rekordboxExport.registeringTracks') : t('rekordboxExport.downloadingTracks')}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 overflow-hidden">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              {completedCount} / {totalTracks}
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
          <Progress
            value={percent}
            className={!isRegistering ? '[&>div]:bg-[hsl(var(--info))] [&>div]:shadow-[0_0_8px_hsl(var(--info)/0.5)]' : ''}
          />
        </div>
        <div className="max-h-48 overflow-y-auto overflow-x-hidden">
          {!isRegistering ? (
            <>
              <ExportPhaseSection
                label={t('rekordboxExport.sectionDownloading')}
                icon="↓"
                colorClass="text-[hsl(var(--info))]"
                tracks={groups.downloading}
                showSpinner
              />
              <ExportPhaseSection
                label={t('rekordboxExport.sectionDownloaded')}
                icon="✓"
                colorClass="text-[hsl(var(--success))]"
                tracks={groups.downloaded}
                maxVisible={MAX_VISIBLE_TRACKS}
              />
            </>
          ) : (
            <>
              <ExportPhaseSection
                label={t('rekordboxExport.sectionRegistering')}
                icon="⚡"
                colorClass="text-primary"
                tracks={groups.exporting}
                showSpinner
              />
              <ExportPhaseSection
                label={t('rekordboxExport.sectionCompleted')}
                icon="✓"
                colorClass="text-[hsl(var(--success))]"
                tracks={groups.completed}
                maxVisible={MAX_VISIBLE_TRACKS}
              />
            </>
          )}
          {groups.error.length > 0 && (
            <ExportPhaseSection
              label={t('rekordboxExport.sectionErrors')}
              icon="✗"
              colorClass="text-destructive"
              tracks={groups.error}
              showError
            />
          )}
          {groups.pending.length > 0 && (
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1 text-muted-foreground mt-2">
              ○ {t('rekordboxExport.sectionPending')} ({groups.pending.length})
              <p className="normal-case tracking-normal font-normal text-[11px] mt-1">
                {t('rekordboxExport.pendingCount', { count: groups.pending.length })}
              </p>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t('rekordboxExport.cancel')}
        </Button>
      </DialogFooter>
    </>
  );
}
