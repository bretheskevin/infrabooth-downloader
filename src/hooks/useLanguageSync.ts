import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';

export function useLanguageSync() {
  const { i18n } = useTranslation();
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
}
