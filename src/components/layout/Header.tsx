import { useTranslation } from 'react-i18next';

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <h1 className="text-lg font-semibold">{t('app.title')}</h1>
      {/* UserBadge will go here in Epic 2 */}
    </header>
  );
}
