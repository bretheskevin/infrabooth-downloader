import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChangelogEntry } from './ChangelogEntry';
import { parseChangelog, compareVersions } from '../utils/parseChangelog';
import { useChangelogStore } from '../store';
import { useAppVersion } from '@/hooks';
import { CHANGELOGS, changelogEn } from '../utils/changelogs';

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  const { t, i18n } = useTranslation();
  const currentVersion = useAppVersion();
  const lastSeenVersion = useChangelogStore((s) => s.lastSeenVersion);

  const entries = useMemo(
    () => parseChangelog(CHANGELOGS[i18n.language] ?? changelogEn),
    [i18n.language],
  );

  const shouldExpand = (version: string) => {
    if (version === currentVersion) return true;
    if (!lastSeenVersion) return false;
    return compareVersions(version, lastSeenVersion) > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('changelog.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('changelog.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
          {entries.map((entry) => {
            const isCurrent = entry.version === currentVersion;

            return (
              <Collapsible key={entry.version} defaultOpen={shouldExpand(entry.version)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-1 text-left hover:bg-muted/50 rounded-md group">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">v{entry.version}</span>
                    {entry.date && (
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {t('changelog.current')}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pb-2 pl-1">
                    <ChangelogEntry sections={entry.sections} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
