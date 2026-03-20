import { ExternalLink, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OpenFolderButtonProps {
  onClick: () => void;
  size?: 'sm' | 'default';
  showLabel?: boolean;
  className?: string;
}

export function OpenFolderButton({
  onClick,
  size = 'default',
  showLabel = false,
  className,
}: OpenFolderButtonProps) {
  const { t } = useTranslation();
  const label = t('completion.openFolder');

  if (showLabel) {
    return (
      <Button
        variant="outline"
        onClick={onClick}
        aria-label={label}
        className={cn('gap-2 rounded-xl h-11 px-5', className)}
      >
        <FolderOpen className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    );
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const Icon = size === 'sm' ? ExternalLink : FolderOpen;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={cn(
            buttonSize,
            'rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            className,
          )}
          aria-label={label}
        >
          <Icon className={iconSize} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
