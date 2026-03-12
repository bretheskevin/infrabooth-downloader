import { memo, type ReactNode, type RefObject } from 'react';

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
  size: number;
  start: number;
  className?: string;
  children: ReactNode;
}

export const VirtualRow = memo(function VirtualRow({ size, start, className, children }: VirtualRowProps) {
  return (
    <div
      className={cn('absolute top-0 left-0 w-full', className)}
      style={{
        height: `${size}px`,
        transform: `translateY(${start}px)`,
      }}
    >
      {children}
    </div>
  );
});
