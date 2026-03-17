import { useMemo, useRef } from 'react';
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

  const virtualItems = virtualizer.getVirtualItems();
  const startIndex = virtualItems.length > 0 ? virtualItems[0]!.index : -1;
  const endIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1]!.index : -1;

  const visibleRange = useMemo(() => {
    if (startIndex < 0) return null;
    return { startIndex, endIndex };
  }, [startIndex, endIndex]);

  return {
    parentRef,
    virtualItems,
    totalSize: virtualizer.getTotalSize(),
    visibleRange,
  };
}
