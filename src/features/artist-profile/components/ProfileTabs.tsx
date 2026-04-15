import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TAB_OPTIONS = [
  { key: 'recent' as const, label: 'artistProfile.sortRecent' },
  { key: 'popular' as const, label: 'artistProfile.sortPopular' },
  { key: 'playlists' as const, label: 'artistProfile.playlists' },
] satisfies readonly { key: string; label: string }[];

export type ProfileTab = (typeof TAB_OPTIONS)[number]['key'];

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isStreaming?: boolean;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  isStreaming,
}: ProfileTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-1">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ProfileTab)}>
        <TabsList variant="underline">
          {TAB_OPTIONS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="text-xs px-2">
              {t(label)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isStreaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
