import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useSettingsStore } from '@/features/settings/store';

export function useRekordboxDetection() {
  const rekordboxPathOverride = useSettingsStore((s) => s.rekordboxPathOverride);
  return useQuery({
    queryKey: ['rekordbox-status', rekordboxPathOverride],
    queryFn: () => api.detectRekordbox(rekordboxPathOverride || undefined),
    retry: false,
  });
}
