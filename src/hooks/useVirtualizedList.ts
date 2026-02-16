import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualizedListOptions {
  count: number;
  itemHeight: number;
  overscan?: number;
}

export function useVirtualizedList<T extends HTMLElement = HTMLDivElement>({
  count,
  itemHeight,
  overscan = 3,
}: UseVirtualizedListOptions) {
  const parentRef = useRef<T>(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  return {
    parentRef,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
