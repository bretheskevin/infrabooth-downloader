import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { SelectAllCheckbox } from '@/components/SelectAllCheckbox';
import { SortDirectionSelect } from '@/components/SortDirectionSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SortField } from '@/lib/sort';
import type { SortConfig } from './types';

interface TrackListToolbarProps {
  isDownloadEnabled: boolean;
  hasSelectableTracks: boolean;
  isAllSelected: boolean;
  onToggleAll: () => void;
  sort?: SortConfig<SortField>;
  isStreaming?: boolean;
}

export function TrackListToolbar({
  isDownloadEnabled,
  hasSelectableTracks,
  isAllSelected,
  onToggleAll,
  sort,
  isStreaming,
}: TrackListToolbarProps) {
  const showSelectAll = isDownloadEnabled && hasSelectableTracks;

  return (
    <div className="flex items-center justify-between px-3">
      {showSelectAll ? (
        <SelectAllCheckbox isAllSelected={isAllSelected} onToggleAll={onToggleAll} />
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2">
        {sort && (
          <>
            <SortSelect sort={sort} />
            <SortDirectionSelect
              value={sort.direction}
              onChange={sort.onDirectionChange}
              showIcon={false}
            />
          </>
        )}
        {isStreaming && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
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
          <SelectItem key={key} value={key}>{t(label)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
