import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayerStore } from '../store';

export function RailTabToggle() {
  const { t } = useTranslation();
  const railTab = usePlayerStore((s) => s.railTab);

  return (
    <div className="px-4 py-2 border-b border-border/50">
      <Tabs value={railTab} onValueChange={(v) => usePlayerStore.getState().setRailTab(v as 'queue' | 'comments')}>
        <TabsList className="w-full">
          <TabsTrigger value="queue" className="flex-1 text-xs">
            {t('comments.tabQueue')}
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 text-xs">
            {t('comments.tabComments')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
