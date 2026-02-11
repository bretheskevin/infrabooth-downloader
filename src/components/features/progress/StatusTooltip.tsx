import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatusTooltipProps {
  children: React.ReactNode;
  descriptionId: string;
  mainText: string;
  subText?: string;
}

export function StatusTooltip({ children, descriptionId, mainText, subText }: StatusTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          className="max-w-xs"
          aria-describedby={descriptionId}
        >
          <p id={descriptionId}>{mainText}</p>
          {subText && (
            <p className="text-xs text-primary-foreground/70 mt-1">
              {subText}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
