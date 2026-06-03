import { Toaster as Sonner } from 'sonner';
import { useSettingsStore } from '@/features/settings';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSettingsStore((s) => s.theme);

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      closeButton
      swipeDirections={['left', 'right']}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:select-none',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          closeButton:
            '!static !transform-none !order-last !ml-auto !-mr-1 !border-0 !bg-transparent !text-muted-foreground hover:!text-foreground !transition-colors',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
