import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export function useMenuSettingsListener(onOpenSettings: () => void) {
  useEffect(() => {
    const unlisten = listen('open-settings', () => {
      onOpenSettings();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [onOpenSettings]);
}
