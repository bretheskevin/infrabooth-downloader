import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { ActivityFilter } from '../constants';

interface ActivityFilterChipsProps {
  active: ActivityFilter;
  onChange: (filter: ActivityFilter) => void;
}

const FILTERS: { key: ActivityFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'newTracks.filterAll' },
  { key: 'new', labelKey: 'newTracks.filterNew' },
  { key: 'reposted', labelKey: 'newTracks.filterReposted' },
];

export function ActivityFilterChips({ active, onChange }: ActivityFilterChipsProps) {
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
