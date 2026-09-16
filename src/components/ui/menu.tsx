import * as React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type MenuVariant = 'context' | 'dropdown';

const MenuVariantContext = React.createContext<MenuVariant>('dropdown');

interface MenuProps {
  variant: MenuVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Menu({ variant, open, onOpenChange, modal, defaultOpen, children }: MenuProps) {
  const provider = (root: React.ReactNode) => <MenuVariantContext.Provider value={variant}>{root}</MenuVariantContext.Provider>;
  if (variant === 'context') {
    return provider(
      <ContextMenu onOpenChange={onOpenChange} modal={modal}>
        {children}
      </ContextMenu>,
    );
  }
  return provider(
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={modal} defaultOpen={defaultOpen}>
      {children}
    </DropdownMenu>,
  );
}
Menu.displayName = 'Menu';

const MenuTrigger = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof DropdownMenuTrigger>>(
  ({ children, ...props }, ref) => {
    const variant = React.useContext(MenuVariantContext);
    if (variant === 'context') {
      return (
        <ContextMenuTrigger ref={ref as React.Ref<HTMLSpanElement>} {...props}>
          {children}
        </ContextMenuTrigger>
      );
    }
    return (
      <DropdownMenuTrigger ref={ref as React.Ref<HTMLButtonElement>} {...props}>
        {children}
      </DropdownMenuTrigger>
    );
  },
);
MenuTrigger.displayName = 'MenuTrigger';

const MenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownMenuContent>>(
  ({ children, ...props }, ref) => {
    const variant = React.useContext(MenuVariantContext);
    if (variant === 'context') {
      return (
        <ContextMenuContent ref={ref} {...props}>
          {children}
        </ContextMenuContent>
      );
    }
    return (
      <DropdownMenuContent ref={ref} {...props}>
        {children}
      </DropdownMenuContent>
    );
  },
);
MenuContent.displayName = 'MenuContent';

const MenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownMenuItem>>(
  ({ className, children, ...props }, ref) => {
    const variant = React.useContext(MenuVariantContext);
    if (variant === 'context') {
      return (
        <ContextMenuItem ref={ref} className={cn('gap-2 [&>svg]:size-4 [&>svg]:shrink-0', className)} {...props}>
          {children}
        </ContextMenuItem>
      );
    }
    return (
      <DropdownMenuItem ref={ref} className={className} {...props}>
        {children}
      </DropdownMenuItem>
    );
  },
);
MenuItem.displayName = 'MenuItem';

const MenuSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownMenuSeparator>>((props, ref) => {
  const variant = React.useContext(MenuVariantContext);
  if (variant === 'context') {
    return <ContextMenuSeparator ref={ref} {...props} />;
  }
  return <DropdownMenuSeparator ref={ref} {...props} />;
});
MenuSeparator.displayName = 'MenuSeparator';

function MenuSub({ children, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuSub>) {
  const variant = React.useContext(MenuVariantContext);
  if (variant === 'context') {
    return <ContextMenuSub {...props}>{children}</ContextMenuSub>;
  }
  return <DropdownMenuSub {...props}>{children}</DropdownMenuSub>;
}
MenuSub.displayName = 'MenuSub';

const MenuSubTrigger = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownMenuSubTrigger>>(
  ({ className, children, ...props }, ref) => {
    const variant = React.useContext(MenuVariantContext);
    if (variant === 'context') {
      return (
        <ContextMenuSubTrigger
          ref={ref}
          className={cn('gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0', className)}
          {...props}
        >
          {children}
        </ContextMenuSubTrigger>
      );
    }
    return (
      <DropdownMenuSubTrigger ref={ref} className={className} {...props}>
        {children}
      </DropdownMenuSubTrigger>
    );
  },
);
MenuSubTrigger.displayName = 'MenuSubTrigger';

const MenuSubContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownMenuSubContent>>(
  ({ children, ...props }, ref) => {
    const variant = React.useContext(MenuVariantContext);
    if (variant === 'context') {
      return (
        <ContextMenuSubContent ref={ref} {...props}>
          {children}
        </ContextMenuSubContent>
      );
    }
    return (
      <DropdownMenuSubContent ref={ref} {...props}>
        {children}
      </DropdownMenuSubContent>
    );
  },
);
MenuSubContent.displayName = 'MenuSubContent';

function MenuPortal({ children, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPortal>) {
  const variant = React.useContext(MenuVariantContext);
  if (variant === 'context') {
    return <ContextMenuPortal {...props}>{children}</ContextMenuPortal>;
  }
  return <DropdownMenuPortal {...props}>{children}</DropdownMenuPortal>;
}
MenuPortal.displayName = 'MenuPortal';

export { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator, MenuSub, MenuSubTrigger, MenuSubContent, MenuPortal };
