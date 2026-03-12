import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChangelogEntry } from './ChangelogEntry';
import type { ChangelogSection } from '../utils/parseChangelog';

interface WhatsNewDialogProps {
  open: boolean;
  onDismiss: () => void;
  version: string;
  date: string | null;
  sections: ChangelogSection[];
}

function formatDate(dateStr: string, locale: string): string {
  const parsed = new Date(dateStr + 'T00:00:00');
  if (isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parsed);
}

export function WhatsNewDialog({ open, onDismiss, version, date, sections }: WhatsNewDialogProps) {
  const { t, i18n } = useTranslation();
  const formattedDate = date ? formatDate(date, i18n.language) : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('changelog.whatsNew', { version })}</DialogTitle>
          <DialogDescription>
            {formattedDate ? t('changelog.released', { date: formattedDate }) : t('changelog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ChangelogEntry sections={sections} />
        </div>

        <DialogFooter>
          <Button onClick={onDismiss}>{t('changelog.gotIt')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
