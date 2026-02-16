import type { ReactNode, RefObject } from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualListContainerProps {
  parentRef: RefObject<HTMLDivElement | null>;
  totalSize: number;
  className?: string;
  listClassName?: string;
  ariaLabel?: string;
  children: ReactNode;
}

export function VirtualListContainer({
  parentRef,
  totalSize,
  className,
  listClassName,
  ariaLabel,
  children,
}: VirtualListContainerProps) {
  return (
    <div
      ref={parentRef}
      className={cn('h-full overflow-auto', className)}
      aria-label={ariaLabel}
    >
      <div
        role="list"
        className={cn('relative w-full', listClassName)}
        style={{ height: `${totalSize}px` }}
      >
        {children}
      </div>
    </div>
  );
}

interface VirtualRowProps {
  virtualItem: VirtualItem;
  className?: string;
  children: ReactNode;
}

export function VirtualRow({ virtualItem, className, children }: VirtualRowProps) {
  return (
    <div
      className={cn('absolute top-0 left-0 w-full', className)}
      style={{
        height: `${virtualItem.size}px`,
        transform: `translateY(${virtualItem.start}px)`,
      }}
    >
      {children}
    </div>
  );
}
