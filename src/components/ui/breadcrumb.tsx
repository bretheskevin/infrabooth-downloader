import { ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const isClickable = !isLast && !!item.onClick;

        return (
          <span key={item.label} className="flex items-center gap-1">
            {index > 0 && <span className="text-muted-foreground/50">/</span>}
            {isFirst && isClickable && <ArrowLeft className="h-3 w-3 text-primary" />}
            {isClickable ? (
              <button
                type="button"
                onClick={item.onClick}
                className="truncate max-w-[200px] text-primary hover:underline cursor-pointer"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </button>
            ) : (
              <span className="truncate max-w-[200px] text-foreground font-medium" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
