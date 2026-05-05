import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { useMessagesStore } from '../store';
import { ConversationsList } from './ConversationsList';
import { ConversationPage } from './ConversationPage';

export function WidescreenMessagesLayout() {
  const { t } = useTranslation();
  const selectedConversation = useMessagesStore((s) => s.selectedConversation);

  return (
    <div className="flex flex-1 min-h-0">
      <div className="w-[300px] shrink-0 border-r border-border flex flex-col min-h-0">
        <div className="px-4 pt-2 pb-3 border-b border-border">
          <h2 className="text-lg font-semibold">{t('directMessages.title')}</h2>
        </div>
        <ConversationsList containerClassName="flex-1 min-h-0" />
      </div>
      <div className="flex-1 flex flex-col min-h-0 px-4">
        {selectedConversation ? (
          <ConversationPage onBack={() => useMessagesStore.getState().openPage()} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10" />
            <p className="text-sm">{t('directMessages.selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
