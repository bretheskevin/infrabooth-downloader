import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { OpenFolderButton } from '@/components/OpenFolderButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import { formatRelativeTime } from '@/lib/date';
import { useRemoveHistoryEntry } from '../hooks/useDownloadHistory';
import { DownloadHistoryTrackRow } from './DownloadHistoryTrackRow';
import type { DownloadHistoryEntry } from '@/bindings';

export function DownloadHistoryEntryRow({ entry }: { entry: DownloadHistoryEntry }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const removeEntry = useRemoveHistoryEntry();
  const openFolder = useOpenDownloadFolder(entry.destDir ?? null, () =>
    toast.error(t('downloadHistory.folderMissing')),
  );

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-3 p-3">
        {entry.artworkUrl ? (
          <img
            src={entry.artworkUrl}
            alt=""
            className="h-10 w-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-muted flex-shrink-0" />
        )}

        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2">
            <ChevronIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{entry.title}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {t(`downloadHistory.kind${entry.kind}`)}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-6 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {t('downloadHistory.trackCount', { count: entry.tracks.length })}
            </span>
            <span className="text-xs text-muted-foreground">
              {entry.okCount > 0 && t('downloadHistory.okCount', { count: entry.okCount })}
              {entry.okCount > 0 && entry.failedCount > 0 && ' · '}
              {entry.failedCount > 0 && (
                <span className="text-destructive">
                  {t('downloadHistory.failedCount', { count: entry.failedCount })}
                </span>
              )}
            </span>
            {entry.cancelled && (
              <span className="text-xs text-orange-500">{t('downloadHistory.cancelled')}</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatRelativeTime(new Date(entry.completedAt).toISOString(), t)}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          {entry.destDir && <OpenFolderButton onClick={openFolder} size="sm" />}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeEntry.mutate(entry.id)}
                aria-label={t('downloadHistory.removeEntry')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('downloadHistory.removeEntry')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {expanded && entry.tracks.length > 0 && (
        <div className="border-t px-3 py-2 space-y-0.5">
          {entry.tracks.map((track) => (
            <DownloadHistoryTrackRow key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}
