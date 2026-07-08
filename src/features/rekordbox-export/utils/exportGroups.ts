import type { RekordboxExportStatus } from '@/bindings';
import type { TrackStatus } from '../hooks/useRekordboxExport';

export const MAX_VISIBLE_TRACKS = 3;

export type StatusGroups = Record<RekordboxExportStatus, TrackStatus[]>;

export function groupByStatus(trackStatuses: Map<string, TrackStatus>): StatusGroups {
  const groups: StatusGroups = {
    pending: [],
    downloading: [],
    downloaded: [],
    exporting: [],
    completed: [],
    error: [],
  };
  for (const status of trackStatuses.values()) {
    groups[status.status].push(status);
  }
  return groups;
}

export function deriveExportMetrics(groups: StatusGroups, totalTracks: number) {
  const isRegistering = groups.exporting.length > 0 || groups.completed.length > 0;
  const completedCount = groups.downloaded.length + groups.exporting.length + groups.completed.length + groups.error.length;
  const percent = totalTracks > 0 ? (completedCount / totalTracks) * 100 : 0;
  return { isRegistering, completedCount, percent };
}
