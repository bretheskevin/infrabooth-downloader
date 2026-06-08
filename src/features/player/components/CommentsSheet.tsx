import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '../store';
import { CommentsPanel } from '@/features/comments';
import { EXPANDED_BAR_HEIGHT } from './ExpandedBar';

export function CommentsSheet({ closing }: { closing?: boolean }) {
  const { t } = useTranslation();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.08)] duration-250 max-h-[60vh] flex flex-col',
        closing ? 'animate-out slide-out-to-bottom fill-mode-forwards' : 'animate-in slide-in-from-bottom',
      )}
      style={{ bottom: `${EXPANDED_BAR_HEIGHT}px` }}
    >
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="text-xs font-semibold">{t('comments.title')}</h3>
      </div>
      <CommentsPanel trackId={currentTrack?.trackId} variant="sheet" />
    </div>
  );
}
