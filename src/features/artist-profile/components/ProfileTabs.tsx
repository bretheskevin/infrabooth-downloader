import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TAB_OPTIONS = [
  { key: 'recent' as const, label: 'artistProfile.sortRecent' },
  { key: 'popular' as const, label: 'artistProfile.sortPopular' },
  { key: 'playlists' as const, label: 'artistProfile.playlists' },
  { key: 'likes' as const, label: 'artistProfile.likes' },
] satisfies readonly { key: string; label: string }[];

export type ProfileTab = (typeof TAB_OPTIONS)[number]['key'];

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ProfileTab)} className="px-1">
      <TabsList variant="underline">
        {TAB_OPTIONS.map(({ key, label }) => (
          <TabsTrigger key={key} value={key} className="text-xs px-2">
            {t(label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
