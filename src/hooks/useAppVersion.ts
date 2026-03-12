import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';

let cachedVersion: string | null = null;

export function useAppVersion(): string {
  const [version, setVersion] = useState(cachedVersion ?? '');

  useEffect(() => {
    if (cachedVersion) return;
    getVersion()
      .then((v) => {
        cachedVersion = v;
        setVersion(v);
      })
      .catch(() => {});
  }, []);

  return version;
}
