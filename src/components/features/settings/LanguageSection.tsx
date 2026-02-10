import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

export function LanguageSection() {
  const { t, i18n } = useTranslation();

  // Display current language - selector implemented in Story 8.2
  const currentLanguage = i18n.language === 'fr' ? 'Francais' : 'English';

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-medium">
          {t('settings.language')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.languageDescription')}
        </p>
      </div>

      {/* Placeholder - will be replaced by Select in Story 8.2 */}
      <div className="text-sm">
        {currentLanguage}
        <span className="ml-2 text-muted-foreground">
          {t('settings.comingSoon', '(Selector coming in Story 8.2)')}
        </span>
      </div>
    </div>
  );
}
