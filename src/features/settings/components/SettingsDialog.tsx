import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SettingsSidebar } from './SettingsSidebar';
import { GeneralSettings } from './GeneralSettings';
import { PlaylistsSettings } from './PlaylistsSettings';
import { RekordboxSettings } from './RekordboxSettings';
import { AboutSettings } from './AboutSettings';
import type { SettingsCategory, SettingsDialogProps } from './types';
import { useIsDownloadEnabled } from '../hooks/useIsDownloadEnabled';

const CONTENT_COMPONENTS: Record<SettingsCategory, React.ComponentType> = {
  general: GeneralSettings,
  playlists: PlaylistsSettings,
  rekordbox: RekordboxSettings,
  about: AboutSettings,
};

function ScrollShadow({ position, visible }: { position: 'top' | 'bottom'; visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute right-0 left-0 z-10 h-12 from-background to-transparent transition-opacity ${
        position === 'top' ? 'top-0 bg-gradient-to-b' : 'bottom-0 bg-gradient-to-t'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>('general');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const isDownloadEnabled = useIsDownloadEnabled();

  useEffect(() => {
    if (!isDownloadEnabled && selectedCategory === 'playlists') {
      setSelectedCategory('general');
    }
  }, [isDownloadEnabled, selectedCategory]);

  const updateShadows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowTopShadow(el.scrollTop > 0);
    setShowBottomShadow(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(updateShadows);
    }
  }, [open, selectedCategory, updateShadows]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateShadows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateShadows]);

  // Reset scroll position when changing categories
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedCategory]);

  const ContentComponent = CONTENT_COMPONENTS[selectedCategory];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[640px] sm:max-w-none p-0 gap-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{t('settings.title')}</SheetTitle>
          <SheetDescription>{t('settings.description')}</SheetDescription>
        </SheetHeader>
        <div className="flex h-full">
          <SettingsSidebar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          <div className="min-w-0 flex-1 relative">
            <ScrollShadow position="top" visible={showTopShadow} />
            <div
              ref={scrollRef}
              onScroll={updateShadows}
              role="tabpanel"
              id={`settings-tabpanel-${selectedCategory}`}
              aria-labelledby={`settings-tab-${selectedCategory}`}
              tabIndex={0}
              className="h-full p-6 overflow-y-auto focus-visible:outline-none"
            >
              <div className="space-y-6">
                <ContentComponent />
              </div>
            </div>
            <ScrollShadow position="bottom" visible={showBottomShadow} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
