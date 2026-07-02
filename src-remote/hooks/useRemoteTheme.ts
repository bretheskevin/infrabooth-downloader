import { useEffect } from 'react';

export function useRemoteTheme(theme: 'light' | 'dark' | undefined): void {
  useEffect(() => {
    if (!theme) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}
