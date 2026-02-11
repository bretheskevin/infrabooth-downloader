import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusDetailsProps {
  content: React.ReactNode;
}

export function StatusDetails({ content }: StatusDetailsProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="text-xs text-warning hover:text-warning/80 hover:underline inline-flex items-center gap-0.5 focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-1 rounded"
        aria-expanded={isOpen}
      >
        {t('errors.showDetails')}
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="text-xs text-muted-foreground mt-1">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
