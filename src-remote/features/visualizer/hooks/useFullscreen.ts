import { useEffect, useSyncExternalStore } from 'react';

export function isFullscreenSupported(): boolean {
  return Boolean(document.fullscreenEnabled) && typeof document.documentElement.requestFullscreen === 'function';
}

export function isStandaloneWebApp(): boolean {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;
}

export function requestAppFullscreen(): void {
  if (!isFullscreenSupported() || document.fullscreenElement) return;
  document.documentElement.requestFullscreen().catch(() => {
    // refused (no user gesture, iPhone Safari): stay windowed
  });
}

export function exitAppFullscreen(): void {
  if (!document.fullscreenElement || typeof document.exitFullscreen !== 'function') return;
  document.exitFullscreen().catch(() => {
    // already left via a system gesture
  });
}

export function toggleAppFullscreen(): void {
  if (document.fullscreenElement) exitAppFullscreen();
  else requestAppFullscreen();
}

function subscribeToFullscreen(callback: () => void) {
  document.addEventListener('fullscreenchange', callback);
  return () => document.removeEventListener('fullscreenchange', callback);
}

function getIsFullscreen() {
  return Boolean(document.fullscreenElement);
}

export function useIsFullscreen(): boolean {
  return useSyncExternalStore(subscribeToFullscreen, getIsFullscreen);
}

export function useExitFullscreenOnUnmount(): void {
  useEffect(() => exitAppFullscreen, []);
}
