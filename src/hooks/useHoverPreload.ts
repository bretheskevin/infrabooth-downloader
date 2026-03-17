import { useCallback, useRef } from 'react';

/**
 * Manages the cancel-on-leave pattern for hover-based preloading.
 * Takes a callback that starts the preload and returns a cancel function.
 * Returns stable `onHoverStart` / `onHoverEnd` handlers for TrackRow.
 */
export function useHoverPreload(
  onHover: (() => (() => void) | undefined) | undefined,
) {
  const cancelRef = useRef<(() => void) | null>(null);

  const onHoverStart = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = onHover?.() ?? null;
  }, [onHover]);

  const onHoverEnd = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  return { onHoverStart, onHoverEnd };
}
