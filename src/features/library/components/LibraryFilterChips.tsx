import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { LibraryFilter } from '../types';

interface LibraryFilterChipsProps {
  active: LibraryFilter;
  onChange: (filter: LibraryFilter) => void;
}

const FILTERS: { key: LibraryFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'library.filterAll' },
  { key: 'mine', labelKey: 'library.filterMine' },
  { key: 'liked', labelKey: 'library.filterLiked' },
];

export function LibraryFilterChips({ active, onChange }: LibraryFilterChipsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      {FILTERS.map(({ key, labelKey }) => (
        <Button
          key={key}
          variant={active === key ? 'default' : 'secondary'}
          size="sm"
          className="rounded-full px-3.5"
          onClick={() => onChange(key)}
        >
          {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
