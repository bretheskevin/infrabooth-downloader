import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { SelectAllCheckbox } from '@/components/SelectAllCheckbox';
import { SortDirectionSelect } from '@/components/SortDirectionSelect';
import { FilterChips } from '@/components/FilterChips';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SortConfig } from './types';

interface DetailViewToolbarProps<S extends string = string> {
  isDownloadEnabled: boolean;
  hasSelectableTracks: boolean;
  isAllSelected: boolean;
  onToggleAll: () => void;
  sort?: SortConfig<S>;
  isStreaming?: boolean;
}

export function DetailViewToolbar<S extends string = string>({
  isDownloadEnabled,
  hasSelectableTracks,
  isAllSelected,
  onToggleAll,
  sort,
  isStreaming,
}: DetailViewToolbarProps<S>) {
  const showSelectAll = isDownloadEnabled && hasSelectableTracks;
  const isSelectVariant = sort?.variant === 'select';
  const showChipsRow = sort && !isSelectVariant;
  const showSecondRow = showSelectAll || isSelectVariant || (!sort && isStreaming);

  if (!showChipsRow && !showSecondRow) return null;

  return (
    <div className="flex flex-col gap-2">
      {showChipsRow && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <FilterChips
              options={sort.options}
              active={sort.active}
              onChange={sort.onChange}
            />
            {isStreaming && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          <SortDirectionSelect
            value={sort.direction}
            onChange={sort.onDirectionChange}
          />
        </div>
      )}
      {showSecondRow && (
        <div className="flex items-center justify-between px-3">
          {showSelectAll ? (
            <SelectAllCheckbox isAllSelected={isAllSelected} onToggleAll={onToggleAll} />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            {isSelectVariant && <SortSelect sort={sort} />}
            {isSelectVariant && (
              <SortDirectionSelect
                value={sort.direction}
                onChange={sort.onDirectionChange}
                showIcon={false}
              />
            )}
            {(isSelectVariant || !sort) && isStreaming && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SortSelect<S extends string>({ sort }: { sort: SortConfig<S> }) {
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
