import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { noop } from '@/lib/utils';
import { ConversationsList } from './ConversationsList';
import { useMessagesStore } from '../store';

export function MessagesPage() {
  const { t } = useTranslation();

  const handleBack = () => {
    useMessagesStore.getState().clear();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label={t('common.back')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{t('directMessages.title')}</h2>
      </div>

      <ConversationsList containerClassName="flex-1 min-h-0" onClose={noop} />
    </div>
  );
}
