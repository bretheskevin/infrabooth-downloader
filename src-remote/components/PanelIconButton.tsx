import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PanelIconButton({ className, ...props }: Omit<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return <Button variant="ghost" size="icon" className={cn('h-9 w-9 text-muted-foreground', className)} {...props} />;
}
