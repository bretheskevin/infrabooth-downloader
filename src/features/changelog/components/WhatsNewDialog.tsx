import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChangelogEntry } from './ChangelogEntry';
import type { ChangelogEntry as ChangelogEntryData } from '../utils/parseChangelog';

interface WhatsNewDialogProps {
  open: boolean;
  onDismiss: () => void;
  previousVersion: string | null;
  entries: ChangelogEntryData[];
}

function formatDate(dateStr: string, locale: string): string {
  const parsed = new Date(dateStr + 'T00:00:00');
  if (isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parsed);
}

function getHeaderText(
  entries: ChangelogEntryData[],
  previousVersion: string | null,
  t: TFunction,
  locale: string,
): { title: string; description: string } {
  if (entries.length > 1) {
    return {
      title: t('changelog.whatsNewSince', { version: previousVersion ?? '' }),
      description: t('changelog.updateCount', { count: entries.length }),
    };
  }
  const latest = entries[0];
  const formattedDate = latest?.date ? formatDate(latest.date, locale) : null;
  return {
    title: t('changelog.whatsNew', { version: latest?.version ?? '' }),
    description: formattedDate ? t('changelog.released', { date: formattedDate }) : t('changelog.description'),
  };
}

function MissedVersionItem({ entry, locale }: { entry: ChangelogEntryData; locale: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">v{entry.version}</span>
        {entry.date && <span className="text-xs text-muted-foreground">{`· ${formatDate(entry.date, locale)}`}</span>}
      </div>
      <ChangelogEntry sections={entry.sections} />
    </div>
  );
}

export function WhatsNewDialog({ open, onDismiss, previousVersion, entries }: WhatsNewDialogProps) {
  const { t, i18n } = useTranslation();
  const { title, description } = getHeaderText(entries, previousVersion, t, i18n.language);
  const isMultiVersion = entries.length > 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {isMultiVersion ? (
            <div className="space-y-4">
              {entries.map((entry) => (
                <MissedVersionItem key={entry.version} entry={entry} locale={i18n.language} />
              ))}
            </div>
          ) : (
            <ChangelogEntry sections={entries[0]?.sections ?? []} />
          )}
        </div>

        <DialogFooter>
          <Button onClick={onDismiss}>{t('changelog.gotIt')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
