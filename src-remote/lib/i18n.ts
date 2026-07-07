import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

type LangKey = 'en' | 'fr';

const resources: Record<LangKey, Record<string, string>> = {
  en: en.remote,
  fr: fr.remote,
};

export function t(key: string, language: string): string {
  const lang: LangKey = language === 'fr' ? 'fr' : 'en';
  return resources[lang][key] ?? key;
}
