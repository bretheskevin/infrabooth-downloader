import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationsList } from './NotificationsList';
import { useNotificationsStore } from '../store';

export function NotificationsPage() {
  const { t } = useTranslation();

  const handleClose = () => {
    useNotificationsStore.getState().closePage();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{t('notifications.title')}</h2>
      </div>

      <NotificationsList
        containerClassName="flex-1 min-h-0 overflow-y-auto"
        sentinelClassName="h-4"
        onClose={handleClose}
      />
    </div>
  );
}
