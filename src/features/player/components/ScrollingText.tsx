import { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export function ScrollingText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (container && textEl) {
      setShouldScroll(textEl.scrollWidth > container.clientWidth);
    }
  }, []);

  useLayoutEffect(() => {
    setShouldScroll(false);
    requestAnimationFrame(measure);
  }, [text, measure]);

  return (
    <div ref={containerRef} className={cn('overflow-hidden whitespace-nowrap', className)}>
      <span ref={textRef} className={cn('inline-flex gap-8', shouldScroll && 'animate-marquee')}>
        <span>{text}</span>
        {shouldScroll && <span aria-hidden="true">{text}</span>}
      </span>
    </div>
  );
}
