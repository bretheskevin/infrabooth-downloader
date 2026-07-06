import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@remote/lib/i18n';
import { useSelections } from '../hooks/useSelections';
import { filterPersonalMixes, filterCuratedPicks } from '../utils/filterSelections';
import type { RemoteSelection } from '../api/selections';
import SelectionShelf from './SelectionShelf';

interface Props {
  host: string;
  token: string;
  language: string;
  onSelect: (selection: RemoteSelection) => void;
}

export default function SelectionsSection({ host, token, language, onSelect }: Props) {
  const { selections, loading, error, refetch } = useSelections(host, token);

  const personalMixes = filterPersonalMixes(selections);
  const curatedPicks = filterCuratedPicks(selections);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-4">
        <p className="text-sm text-muted-foreground">{t('selectionsError', language)}</p>
        <Button variant="ghost" size="sm" onClick={refetch}>
          {t('retry', language)}
        </Button>
      </div>
    );
  }

  if (personalMixes.length === 0 && curatedPicks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 py-2">
      <SelectionShelf title={t('mixedForYou', language)} selections={personalMixes} language={language} onSelect={onSelect} />
      <SelectionShelf title={t('freshPicks', language)} selections={curatedPicks} language={language} onSelect={onSelect} />
    </div>
  );
}
