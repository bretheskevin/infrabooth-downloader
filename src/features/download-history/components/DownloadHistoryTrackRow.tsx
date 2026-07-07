import { CheckCircle2, XCircle, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DownloadHistoryTrack } from '@/bindings';
import { DrmHelp } from './DrmHelp';

const STATUS_ICON: Record<string, React.ElementType> = {
  complete: CheckCircle2,
  failed: XCircle,
  skipped: Ban,
};

const STATUS_COLOR: Record<string, string> = {
  complete: 'text-green-500',
  failed: 'text-destructive',
  skipped: 'text-muted-foreground',
};

const REASON_I18N: Record<string, string> = {
  drm_protected: 'errors.groupDrmProtected',
  geo_blocked: 'errors.groupGeoBlocked',
  unavailable: 'errors.groupUnavailable',
  network: 'errors.groupNetwork',
  other: 'errors.groupOther',
};

export function DownloadHistoryTrackRow({ track }: { track: DownloadHistoryTrack }) {
  const { t } = useTranslation();
  const Icon = STATUS_ICON[track.status] ?? XCircle;
  const colorClass = STATUS_COLOR[track.status] ?? 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2 py-1 px-2 text-sm">
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${colorClass}`} />
      <span className="truncate flex-1">{track.title}</span>
      <span className="text-muted-foreground text-xs truncate max-w-[120px]">{track.artist}</span>
      {track.reason && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {t(REASON_I18N[track.reason] ?? 'errors.groupOther')}
          {track.reason === 'drm_protected' && <DrmHelp />}
        </span>
      )}
    </div>
  );
}
