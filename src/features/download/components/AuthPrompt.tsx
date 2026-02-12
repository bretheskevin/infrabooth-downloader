import { useTranslation } from 'react-i18next';

export function AuthPrompt() {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
      <p className="text-sm text-muted-foreground">
        {t('download.signInRequired')}
      </p>
    </div>
  );
}
