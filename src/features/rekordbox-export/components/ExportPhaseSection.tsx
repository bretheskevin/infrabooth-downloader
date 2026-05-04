import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { TrackStatus } from '../hooks/useRekordboxExport';

interface ExportPhaseSectionProps {
  label: string;
  icon: string;
  colorClass: string;
  tracks: TrackStatus[];
  maxVisible?: number;
  showSpinner?: boolean;
  showError?: boolean;
}

export function ExportPhaseSection({
  label,
  icon,
  colorClass,
  tracks,
  maxVisible,
  showSpinner = false,
  showError = false,
}: ExportPhaseSectionProps) {
  const { t } = useTranslation();

  if (tracks.length === 0) return null;

  const visible = maxVisible ? tracks.slice(0, maxVisible) : tracks;
  const hiddenCount = maxVisible ? Math.max(0, tracks.length - maxVisible) : 0;

  return (
    <div className="mb-2 last:mb-0">
      <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${colorClass}`}>
        {icon} {label} ({tracks.length})
      </div>
      <div className="border border-border rounded-md overflow-hidden">
        {visible.map((track) => (
          <div key={track.trackId} className="flex items-center gap-2 px-2 py-1.5 text-xs border-b border-border last:border-b-0">
            {showSpinner && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
            <span className="truncate flex-1 min-w-0">{track.trackTitle}</span>
            {track.percent != null && track.percent > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{Math.round(track.percent * 100)}%</span>
            )}
            {showError && track.error && <div className="text-[10px] text-destructive truncate max-w-[50%]">{track.error}</div>}
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="px-2 py-1 text-[11px] text-muted-foreground border-t border-border">
            {t('rekordboxExport.moreCount', { count: hiddenCount })}
          </div>
        )}
      </div>
    </div>
  );
}
