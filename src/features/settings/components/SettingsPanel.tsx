import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { LanguageSection } from './LanguageSection';
import { ThemeSection } from './ThemeSection';
import { ConcurrentDownloadsSection } from './ConcurrentDownloadsSection';
import { PlaylistOrderSection } from './PlaylistOrderSection';
import { DownloadLocationSection } from './DownloadLocationSection';
import { Button } from '@/components/ui/button';
import { ChangelogDialog } from '@/features/changelog';
import { useAppVersion } from '@/hooks';

function ScrollShadow({ position, visible }: { position: 'top' | 'bottom'; visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute right-0 left-0 z-10 h-12 from-background to-transparent transition-opacity ${
        position === 'top' ? 'top-0 bg-gradient-to-b' : 'bottom-0 bg-gradient-to-t'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const appVersion = useAppVersion();
  const [changelogOpen, setChangelogOpen] = useState(false);

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
  }, [open, updateShadows]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateShadows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateShadows]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[400px]"
        aria-describedby="settings-description"
      >
        <SheetHeader>
          <SheetTitle>{t('settings.title')}</SheetTitle>
          <SheetDescription id="settings-description">
            {t('settings.description', 'Customize your app preferences.')}
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-6">
          <ScrollShadow position="top" visible={showTopShadow} />
          <div
            ref={scrollRef}
            onScroll={updateShadows}
            className="space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)] pl-1 pr-3"
          >
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.categoryGeneral')}</h3>
              <LanguageSection />
              <Separator />
              <ThemeSection />
              <Separator />
              <DownloadLocationSection />
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.categoryPlaylists')}</h3>
              <ConcurrentDownloadsSection />
              <Separator />
              <PlaylistOrderSection />
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.categoryAbout')}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('app.version', { version: appVersion || '...' })}</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setChangelogOpen(true)}
                >
                  {t('settings.viewChangelog')}
                </Button>
              </div>
            </div>
          </div>
          <ScrollShadow position="bottom" visible={showBottomShadow} />
        </div>
        <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
      </SheetContent>
    </Sheet>
  );
}
