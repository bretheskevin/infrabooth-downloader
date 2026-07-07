import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusTooltip } from '@/features/progress/components/StatusTooltip';

export function DrmHelp() {
  const { t } = useTranslation();

  return (
    <StatusTooltip
      descriptionId="drm-help-description"
      mainText={t('downloadHistory.drmHelpTitle')}
      subText={t('downloadHistory.drmHelpBody')}
    >
      <button
        type="button"
        aria-label={t('downloadHistory.drmHelpTitle')}
        className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </StatusTooltip>
  );
}
