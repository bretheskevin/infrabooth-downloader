import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings/store';

const SUPPORTED_LANGUAGES = [
  { code: 'en', labelKey: 'settings.languageEnglish' },
  { code: 'fr', labelKey: 'settings.languageFrench' },
] as const;

export function LanguageSection() {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const currentLabelKey =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === language)?.labelKey ?? 'settings.languageEnglish';

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'fr');
    i18n.changeLanguage(newLanguage);
    document.documentElement.lang = newLanguage;

    // Announce to screen readers using translation
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    const languageName = newLanguage === 'en' ? 'English' : 'Français';
    announcement.textContent = t('accessibility.languageChanged', { language: languageName });
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="language-select" className="text-base font-medium">
          {t('settings.language')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.languageDescription')}
        </p>
      </div>

      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger id="language-select" className="w-[180px]">
          <SelectValue>{t(currentLabelKey)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {t(lang.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
