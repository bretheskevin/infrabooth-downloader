import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Shuffle } from 'lucide-react';
import { SelectAllCheckbox } from '@/components/SelectAllCheckbox';
import { SortDirectionSelect } from '@/components/SortDirectionSelect';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import type { SortField } from '@/lib/sort';
import type { SortConfig } from './types';

interface TrackListToolbarProps {
  isDownloadEnabled: boolean;
  hasSelectableTracks: boolean;
  isAllSelected: boolean;
  onToggleAll: () => void;
  sort?: SortConfig<SortField>;
  onPlayShuffled?: () => void;
}

export function TrackListToolbar({
  isDownloadEnabled,
  hasSelectableTracks,
  isAllSelected,
  onToggleAll,
  sort,
  onPlayShuffled,
}: TrackListToolbarProps) {
  const { t } = useTranslation();
  const isWidescreen = useIsWidescreen();
  const showSelectAll = isDownloadEnabled && hasSelectableTracks;

  return (
    <div className="flex items-center justify-between px-3">
      <div className="flex items-center gap-3">
        {showSelectAll && <SelectAllCheckbox isAllSelected={isAllSelected} onToggleAll={onToggleAll} />}
        {onPlayShuffled && !isWidescreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPlayShuffled}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Shuffle className="h-3 w-3" />
            <span>{t('common.shuffle')}</span>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {sort && (
          <>
            <SortSelect sort={sort} />
            <SortDirectionSelect value={sort.direction} onChange={sort.onDirectionChange} showIcon={false} />
          </>
        )}
      </div>
    </div>
  );
}

function SortSelect({ sort }: { sort: SortConfig<SortField> }) {
  const { t } = useTranslation();

  return (
    <Select value={sort.active} onValueChange={sort.onChange}>
      <SelectTrigger className="h-7 text-xs w-auto gap-1.5 px-2">
        <ArrowUpDown className="h-3 w-3 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sort.options.map(({ key, label }) => (
          <SelectItem key={key} value={key}>
            {t(label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
