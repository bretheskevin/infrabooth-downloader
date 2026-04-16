import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { linkifyText } from '@/lib/linkify';

interface ExpandableDescriptionProps {
  description: string;
}

export function ExpandableDescription({ description }: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  const updateScrollIndicators = (el: HTMLElement) => {
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  };

  const handleToggle = () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand) {
      requestAnimationFrame(() => {
        if (ref.current) updateScrollIndicators(ref.current);
      });
    }
  };

  return (
    <div className="relative">
      {isExpanded && canScrollUp && (
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
      )}
      <p
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (window.getSelection()?.toString()) return;
          handleToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        onScroll={(e) => updateScrollIndicators(e.currentTarget)}
        className={cn(
          'text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-foreground/80 transition-colors whitespace-pre-line',
          isExpanded ? 'max-h-32 overflow-y-auto' : 'line-clamp-3',
        )}
      >
        {linkifyText(description)}
      </p>
      {isExpanded && canScrollDown && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
}
