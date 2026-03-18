import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2, Download, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettingsCategory, SettingsSidebarProps } from './types';

const CATEGORIES: { id: SettingsCategory; icon: React.ElementType; labelKey: string }[] = [
  { id: 'general', icon: Settings2, labelKey: 'settings.categoryGeneral' },
  { id: 'playlists', icon: Download, labelKey: 'settings.categoryPlaylists' },
  { id: 'about', icon: Info, labelKey: 'settings.categoryAbout' },
];

export function SettingsSidebar({ selectedCategory, onSelectCategory }: SettingsSidebarProps) {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = CATEGORIES.findIndex((c) => c.id === selectedCategory);
      let nextIndex = currentIndex;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % CATEGORIES.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = CATEGORIES.length - 1;
      }

      const category = CATEGORIES[nextIndex];
      if (nextIndex !== currentIndex && category) {
        onSelectCategory(category.id);
        // Focus the new tab
        const tablist = e.currentTarget;
        const tabs = tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        tabs[nextIndex]?.focus();
      }
    },
    [selectedCategory, onSelectCategory]
  );

  return (
    <nav
      role="tablist"
      aria-label={t('settings.title')}
      aria-orientation="vertical"
      onKeyDown={handleKeyDown}
      className="min-w-[140px] flex-shrink-0 bg-muted/50 border-r border-border p-2 pt-6 space-y-1"
    >
      {CATEGORIES.map(({ id, icon: Icon, labelKey }) => {
        const isSelected = selectedCategory === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`settings-tabpanel-${id}`}
            id={`settings-tab-${id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectCategory(id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
