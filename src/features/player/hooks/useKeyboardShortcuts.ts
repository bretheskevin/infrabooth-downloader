import { useEffect } from 'react';
import { usePlayerStore } from '../store';

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isInteractiveElement(el: Element | null): boolean {
  if (!el) return false;
  if (INTERACTIVE_TAGS.has(el.tagName)) return true;
  if (el instanceof HTMLElement && (el.isContentEditable || el.contentEditable === 'true')) return true;
  if (el instanceof HTMLButtonElement) return true;
  if (el.getAttribute('role') === 'button') return true;
  return false;
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      if (isInteractiveElement(document.activeElement)) return;

      const { state, pause, resume } = usePlayerStore.getState();
      if (state === 'stopped') return;

      e.preventDefault();

      if (state === 'playing') {
        pause();
      } else {
        resume();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
