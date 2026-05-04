import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualizedListOptions {
  count: number;
  itemHeight: number | ((index: number) => number);
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

  const estimateSize = typeof itemHeight === 'function' ? itemHeight : () => itemHeight;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize,
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
