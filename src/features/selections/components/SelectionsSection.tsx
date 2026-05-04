import { useMemo } from 'react';
import { AlertCircle, Music, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Selection } from '@/bindings';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { cn } from '@/lib/utils';

import { SelectionCard } from './SelectionCard';
import { useSelections } from '../hooks/useSelections';

const CURATED_TITLES = ['Daily Drops', 'Weekly Wave'] as const;

function selectionGridClassName(isWidescreen: boolean) {
  return isWidescreen ? 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]' : 'grid grid-cols-2 sm:grid-cols-3 gap-3';
}

interface SelectionsSectionProps {
  onSelectMix: (mix: Selection) => void;
  onDownloadMix: (mix: Selection) => void;
}

function LoadingSkeleton({ count = 3, isWidescreen = false }: { count?: number; isWidescreen?: boolean }) {
  const actualCount = isWidescreen ? Math.max(count, 4) : count;
  return (
    <div className={selectionGridClassName(isWidescreen)}>
      {Array.from({ length: actualCount }).map((_, i) => (
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

interface SelectionGroupProps {
  icon: React.ReactNode;
  title: string;
  items: Selection[] | undefined;
  isLoading: boolean;
  skeletonCount?: number;
  label?: (mix: Selection) => string | undefined;
  onSelect: (mix: Selection) => void;
  onDownload: (mix: Selection) => void;
  isWidescreen?: boolean;
}

function SelectionGroup({
  icon,
  title,
  items,
  isLoading,
  skeletonCount = 3,
  label,
  onSelect,
  onDownload,
  isWidescreen = false,
}: SelectionGroupProps) {
  const gridClassName = selectionGridClassName(isWidescreen);

  return (
    <div className="space-y-3">
      <div className={cn('flex items-center gap-2', isWidescreen && 'border-b border-border/40 pb-2 mb-1')}>
        {icon}
        <h3 className={cn('font-semibold text-muted-foreground', isWidescreen ? 'text-[15px]' : 'text-sm')}>{title}</h3>
        {isWidescreen && items && <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>}
      </div>

      {isLoading ? (
        <LoadingSkeleton count={skeletonCount} isWidescreen={isWidescreen} />
      ) : (
        <div className={gridClassName}>
          {items!.map((mix, i) => (
            <SelectionCard
              key={mix.id}
              mix={mix}
              index={i}
              label={label?.(mix)}
              onClick={() => onSelect(mix)}
              onDownload={() => onDownload(mix)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SelectionsSection({ onSelectMix, onDownloadMix }: SelectionsSectionProps) {
  const { t } = useTranslation();
  const isWidescreen = useIsWidescreen();
  const { data: allSelections, isLoading, isError, refetch } = useSelections();
  const personalMixes = useMemo(() => allSelections?.filter((s) => s.title.includes('Your Mix')), [allSelections]);
  const curatedPicks = useMemo(
    () =>
      allSelections?.filter((s) => (CURATED_TITLES as readonly string[]).includes(s.title)).sort((a, b) => a.title.localeCompare(b.title)),
    [allSelections],
  );

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>{t('selections.loadError')}</span>
        <button type="button" onClick={() => void refetch()} className="text-primary hover:underline">
          {t('selections.retry')}
        </button>
      </div>
    );
  }

  const hasPersonal = !isLoading && personalMixes && personalMixes.length > 0;
  const hasCurated = !isLoading && curatedPicks && curatedPicks.length > 0;

  if (!isLoading && !hasPersonal && !hasCurated) return null;

  return (
    <div className="space-y-6">
      {(isLoading || hasPersonal) && (
        <SelectionGroup
          icon={<Music className="h-4 w-4 text-primary" />}
          title={t('selections.sectionTitle')}
          items={personalMixes}
          isLoading={isLoading}
          onSelect={onSelectMix}
          onDownload={onDownloadMix}
          isWidescreen={isWidescreen}
        />
      )}

      {(isLoading || hasCurated) && (
        <SelectionGroup
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          title={t('selections.curatedTitle')}
          items={curatedPicks}
          isLoading={isLoading}
          skeletonCount={2}
          label={(mix) => mix.title}
          onSelect={onSelectMix}
          onDownload={onDownloadMix}
          isWidescreen={isWidescreen}
        />
      )}
    </div>
  );
}
