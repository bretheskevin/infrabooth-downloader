import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './button';

interface RefreshButtonProps {
  onRefresh: () => Promise<unknown> | unknown;
  'aria-label': string;
  className?: string;
  iconClassName?: string;
}

export function RefreshButton({
  onRefresh,
  'aria-label': ariaLabel,
  className = 'h-5 w-5 text-muted-foreground',
  iconClassName = 'h-3 w-3',
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // Errors are handled by the onRefresh caller
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void handleClick()}
      aria-label={ariaLabel}
      className={className}
    >
      <RefreshCw className={`${iconClassName}${isRefreshing ? ' animate-spin' : ''}`} />
    </Button>
  );
}
