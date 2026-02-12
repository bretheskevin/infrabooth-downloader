import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings/store';

export function useLanguageSync() {
  const { i18n } = useTranslation();
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    // Sync i18n language with settings store
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    // Keep document lang attribute in sync for accessibility
    if (document.documentElement.lang !== language) {
      document.documentElement.lang = language;
    }
  }, [language, i18n]);
}
