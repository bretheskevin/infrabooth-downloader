import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualizedListOptions {
  count: number;
  itemHeight: number;
  overscan?: number;
  initialScrollOffset?: number;
}

export function useVirtualizedList<T extends HTMLElement = HTMLDivElement>({
  count,
  itemHeight,
  overscan = 3,
  initialScrollOffset,
}: UseVirtualizedListOptions) {
  const parentRef = useRef<T>(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
    initialOffset: initialScrollOffset,
  });

  return {
    parentRef,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    getScrollOffset: () => virtualizer.scrollOffset ?? 0,
  };
}
