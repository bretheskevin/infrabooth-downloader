import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/features/player';
import { useIsExpandedBarVisible } from '@/features/player/hooks/useIsExpandedBarVisible';
import { EXPANDED_BAR_HEIGHT, EXPANDED_BAR_GAP } from '@/features/player/components/ExpandedBar';
import { useIsDownloadEnabled } from '@/features/settings';

interface SelectionFloatingBarProps {
  selectedCount: number;
  onDownload: () => void;
}

export function SelectionFloatingBar({ selectedCount, onDownload }: SelectionFloatingBarProps) {
  const { t } = useTranslation();
  const expandedBarVisible = useIsExpandedBarVisible();
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const isDownloadEnabled = useIsDownloadEnabled();

  if (!isDownloadEnabled) return null;
  if (selectedCount === 0 || (expandedBarVisible && isQueueOpen)) return null;

  const bottom = expandedBarVisible ? EXPANDED_BAR_HEIGHT + EXPANDED_BAR_GAP : 24;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200 transition-[bottom] ease-in-out"
      style={{ bottom }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-background/80 backdrop-blur-xl border shadow-lg whitespace-nowrap">
        <span className="text-sm font-medium">
          {t('library.detail.selected', { count: selectedCount })}
        </span>
        <Button size="sm" onClick={onDownload} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          {t('library.detail.download')}
        </Button>
      </div>
    </div>
  );
}
