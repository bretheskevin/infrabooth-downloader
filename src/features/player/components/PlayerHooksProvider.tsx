import { usePlayerEvents } from '../hooks/usePlayerEvents';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export function PlayerHooksProvider() {
  usePlayerEvents();
  useKeyboardShortcuts();
  return null;
}
