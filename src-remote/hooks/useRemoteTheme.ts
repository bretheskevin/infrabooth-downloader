import { useEffect } from 'react';

export function useRemoteTheme(theme: 'light' | 'dark' | undefined, forceDark: boolean): void {
  useEffect(() => {
    const effectiveTheme = forceDark ? 'dark' : theme;
    if (!effectiveTheme) return;
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  }, [theme, forceDark]);
}
