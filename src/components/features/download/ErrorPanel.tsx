import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { FailedTrack, FailureReasonCategory } from '@/types/download';
import { groupFailuresByReason } from '@/lib/groupFailuresByReason';
import { FailureGroup } from './FailureGroup';

interface ErrorPanelProps {
  failedTracks: FailedTrack[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_ORDER: FailureReasonCategory[] = [
  'geo_blocked',
  'unavailable',
  'network',
  'other',
];

export function ErrorPanel({
  failedTracks,
  isOpen,
  onOpenChange,
}: ErrorPanelProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  if (failedTracks.length === 0) return null;

  const groupedFailures = groupFailuresByReason(failedTracks);

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleContent>
        <div
          ref={panelRef}
          id="error-panel-content"
          role="region"
          aria-label={t('errors.panelTitle')}
          aria-live="polite"
          className={cn(
            'mt-3 rounded-lg border border-border bg-card',
            'dark:border-border dark:bg-card'
          )}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('errors.panelTitle')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label={t('errors.closePanel')}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Panel Content */}
          <ScrollArea className="max-h-[200px]">
            <div className="p-3" role="list">
              {CATEGORY_ORDER.map((category) => {
                const tracks = groupedFailures.get(category);
                if (!tracks || tracks.length === 0) return null;
                return (
                  <FailureGroup
                    key={category}
                    category={category}
                    tracks={tracks}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
