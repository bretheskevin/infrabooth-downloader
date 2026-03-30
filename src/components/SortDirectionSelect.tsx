import { useTranslation } from 'react-i18next';
import { ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SORT_DIRECTIONS, type SortDirection } from '@/lib/sort';

interface SortDirectionSelectProps {
  value: SortDirection;
  onChange: (direction: SortDirection) => void;
  showIcon?: boolean;
}

export function SortDirectionSelect({ value, onChange, showIcon = true }: SortDirectionSelectProps) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={(v) => {
      if (SORT_DIRECTIONS.includes(v as SortDirection)) onChange(v as SortDirection);
    }}>
      <SelectTrigger className="h-7 text-xs w-auto gap-1.5 px-2">
        {showIcon && <ArrowUpDown className="h-3 w-3 shrink-0" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="asc">{t('library.detail.sortAsc')}</SelectItem>
        <SelectItem value="desc">{t('library.detail.sortDesc')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
