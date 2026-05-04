import { NotificationsList } from './NotificationsList';

interface NotificationsDropdownProps {
  onClose: () => void;
}

export function NotificationsDropdown({ onClose }: NotificationsDropdownProps) {
  return <NotificationsList containerClassName="max-h-[400px] overflow-y-auto py-1" onClose={onClose} markSeen />;
}
