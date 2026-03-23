import { useMemo } from 'react';
import { AlertCircle, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Selection } from '@/bindings';
import { Skeleton } from '@/components/ui/skeleton';

import { SelectionCard } from './SelectionCard';
import { useSelections } from '../hooks/useSelections';

interface SelectionsSectionProps {
  onSelectMix: (mix: Selection) => void;
  onDownloadMix: (mix: Selection) => void;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="h-24 rounded-none" />
          <div className="px-2.5 py-2 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SelectionsSection({ onSelectMix, onDownloadMix }: SelectionsSectionProps) {
  const { t } = useTranslation();
  const { data: allSelections, isLoading, isError, refetch } = useSelections();
  const personalMixes = useMemo(
    () => allSelections?.filter((s) => s.title.includes('Your Mix')),
    [allSelections],
  );

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>{t('selections.loadError')}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-primary hover:underline"
        >
          {t('selections.retry')}
        </button>
      </div>
    );
  }

  if (!isLoading && (!personalMixes || personalMixes.length === 0)) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t('selections.sectionTitle')}
        </h3>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {personalMixes!.map((mix, i) => (
            <SelectionCard
              key={mix.id}
              mix={mix}
              index={i}
              onClick={() => onSelectMix(mix)}
              onDownload={() => onDownloadMix(mix)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
