import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollCarouselProps {
  children: React.ReactNode;
  className?: string;
  ariaLabelLeft?: string;
  ariaLabelRight?: string;
}

export function ScrollCarousel({
  children,
  className,
  ariaLabelLeft = 'Scroll left',
  ariaLabelRight = 'Scroll right',
}: ScrollCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth);
  }, []);

  useEffect(() => {
    updateScrollState();
  });

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative group">
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('left')}
          aria-label={ariaLabelLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full h-7 w-7 shadow-md opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      <div ref={scrollRef} onScroll={updateScrollState} className={className ?? 'flex gap-3 overflow-x-auto scrollbar-none py-1 px-1'}>
        {children}
      </div>
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll('right')}
          aria-label={ariaLabelRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full h-7 w-7 shadow-md opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
