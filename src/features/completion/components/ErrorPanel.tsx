import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type {
  FailedTrack,
  FailureReasonCategory,
} from '@/features/queue/types/download';
import { groupFailuresByReason } from '@/features/completion/utils/groupFailuresByReason';
import { FailureGroup } from './FailureGroup';

interface ErrorPanelProps {
  failedTracks: FailedTrack[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryTrack?: (trackId: string) => void;
  isRetrying?: boolean;
}

// Retryable categories (network, other) listed first, then non-retryable (unavailable, geo_blocked)
const CATEGORY_ORDER: FailureReasonCategory[] = [
  'network',
  'other',
  'unavailable',
  'geo_blocked',
];

export function ErrorPanel({
  failedTracks,
  isOpen,
  onOpenChange,
  onRetryTrack,
  isRetrying = false,
}: ErrorPanelProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

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
            'mt-3 overflow-hidden rounded-lg',
            'border border-border/50 bg-card/80 backdrop-blur-md',
            'shadow-sm dark:border-border/30 dark:bg-card/70'
          )}
        >
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
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

          <ScrollArea className="max-h-[200px]">
            <div className="p-2" role="list">
              {CATEGORY_ORDER.map((category) => {
                const tracks = groupedFailures.get(category);
                if (!tracks || tracks.length === 0) return null;
                return (
                  <FailureGroup
                    key={category}
                    category={category}
                    tracks={tracks}
                    onRetryTrack={onRetryTrack}
                    isRetrying={isRetrying}
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
