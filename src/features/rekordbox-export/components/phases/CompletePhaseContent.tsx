import { useTranslation } from 'react-i18next';
import type { ExportResult } from '@/bindings';
import { Button } from '@/components/ui/button';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExportPhaseSection } from '../ExportPhaseSection';
import { MAX_VISIBLE_TRACKS, type StatusGroups } from '../../utils/exportGroups';

interface CompletePhaseContentProps {
  result: ExportResult;
  groups: StatusGroups;
  onClose: () => void;
}

export function CompletePhaseContent({ result, groups, onClose }: CompletePhaseContentProps) {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('rekordboxExport.complete')}</DialogTitle>
        <DialogDescription>
          {t('rekordboxExport.summaryLine', {
            exported: result.exportedCount,
            skipped: result.skippedCount,
            errors: result.errors.length,
          })}
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-48 overflow-y-auto overflow-x-hidden">
        {groups.error.length > 0 && (
          <ExportPhaseSection
            label={t('rekordboxExport.sectionErrors')}
            icon="✗"
            colorClass="text-destructive"
            tracks={groups.error}
            showError
          />
        )}
        <ExportPhaseSection
          label={t('rekordboxExport.sectionCompleted')}
          icon="✓"
          colorClass="text-[hsl(var(--success))]"
          tracks={groups.completed}
          maxVisible={MAX_VISIBLE_TRACKS}
        />
      </div>
      <DialogFooter>
        <Button onClick={onClose}>{t('rekordboxExport.close')}</Button>
      </DialogFooter>
    </>
  );
}
