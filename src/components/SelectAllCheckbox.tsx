import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface SelectAllCheckboxProps {
  isAllSelected: boolean;
  onToggleAll: () => void;
  className?: string;
}

export function SelectAllCheckbox({ isAllSelected, onToggleAll, className }: SelectAllCheckboxProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn('flex items-center gap-3 cursor-pointer select-none', className)}
      onClick={onToggleAll}
    >
      <Checkbox
        checked={isAllSelected}
        onCheckedChange={onToggleAll}
        className="shrink-0"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      />
      <span className="text-xs text-muted-foreground">
        {t(isAllSelected ? 'library.detail.deselectAll' : 'library.detail.selectAll')}
      </span>
    </div>
  );
}
