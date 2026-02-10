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
import { DownloadLocationSection } from './DownloadLocationSection';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { t } = useTranslation();

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

        <div className="mt-6 space-y-6">
          <LanguageSection />
          <Separator />
          <DownloadLocationSection />
        </div>
      </SheetContent>
    </Sheet>
  );
}
