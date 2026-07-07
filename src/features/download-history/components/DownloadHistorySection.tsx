import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDownloadHistory, useClearHistory } from '../hooks/useDownloadHistory';
import { DownloadHistoryEntryRow } from './DownloadHistoryEntryRow';

export function DownloadHistorySection() {
  const { t } = useTranslation();
  const { data: entries = [], isLoading } = useDownloadHistory();
  const clearHistory = useClearHistory();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isEmpty = !isLoading && entries.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t('downloadHistory.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('downloadHistory.description')}</p>
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t('downloadHistory.empty')}</p>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((entry) => (
              <DownloadHistoryEntryRow key={entry.id} entry={entry} />
            ))}
          </div>

          {entries.length > 0 && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {t('downloadHistory.clearAll')}
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title={t('downloadHistory.clearConfirmTitle')}
        description={t('downloadHistory.clearConfirmBody')}
        onConfirm={() => {
          clearHistory.mutate();
          setShowClearConfirm(false);
        }}
        isLoading={clearHistory.isPending}
      />
    </div>
  );
}
