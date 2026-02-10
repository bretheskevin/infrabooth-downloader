import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

/**
 * Read persisted language from localStorage BEFORE i18n initialization.
 * This prevents flash of wrong language on startup.
 */
function getInitialLanguage(): 'en' | 'fr' {
  try {
    const stored = localStorage.getItem('sc-downloader-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      const lang = parsed?.state?.language;
      if (lang === 'en' || lang === 'fr') {
        return lang;
      }
    }
  } catch (error) {
    // Handle corrupted localStorage or private browsing mode
    console.warn('Failed to read language preference:', error);
  }
  return 'en';
}

const initialLanguage = getInitialLanguage();

// Set document lang attribute immediately for accessibility
document.documentElement.lang = initialLanguage;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
