import { RateLimitDialog } from '@/features/queue/components/RateLimitDialog';
import { useRateLimitDialog } from '@/features/queue/hooks/useRateLimitDialog';
import { DownloadConflictDialog } from '@/features/queue/components/DownloadConflictDialog';
import { WhatsNewDialog } from '@/features/changelog';
import { useChangelogCheck } from '@/features/changelog';
import { ShareTrackDialog } from '@/features/messages';
import { Toaster } from '@/components/ui/sonner';

interface AppDialogsProps {
  /** Download conflict dialog state */
  pendingDownload: unknown | null;
  onConfirmReplace: () => void;
  onCancelReplace: () => void;
}

/**
 * Centralized app-level dialogs.
 * Extracted from App.tsx for cleaner separation of concerns.
 */
export function AppDialogs({ pendingDownload, onConfirmReplace, onCancelReplace }: AppDialogsProps) {
  const { isOpen: rateLimitOpen, handleRetry: handleRateLimitRetry, handleStop: handleRateLimitStop } = useRateLimitDialog();

  const { showWhatsNew, version, date, sections, dismiss } = useChangelogCheck();

  return (
    <>
      <RateLimitDialog open={rateLimitOpen} onRetry={handleRateLimitRetry} onStop={handleRateLimitStop} />
      <DownloadConflictDialog open={pendingDownload !== null} onConfirm={onConfirmReplace} onCancel={onCancelReplace} />
      <WhatsNewDialog open={showWhatsNew} onDismiss={dismiss} version={version} date={date} sections={sections} />
      <ShareTrackDialog />
      <Toaster />
    </>
  );
}
