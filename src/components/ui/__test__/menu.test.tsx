import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from '@/components/ui/menu';

describe('Menu', () => {
  it('renders dropdown content when open', () => {
    render(
      <Menu variant="dropdown" open onOpenChange={vi.fn()}>
        <MenuTrigger asChild>
          <button>Trigger</button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Item One</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.getByText('Item One')).toBeInTheDocument();
  });

  it('renders context content on right click', async () => {
    const user = userEvent.setup();
    render(
      <Menu variant="context">
        <MenuTrigger asChild>
          <div>Right click me</div>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Context Item</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.queryByText('Context Item')).not.toBeInTheDocument();
    await user.pointer({ target: screen.getByText('Right click me'), keys: '[MouseRight]' });
    expect(screen.getByText('Context Item')).toBeInTheDocument();
  });

  it('MenuItem in context variant has icon normalization classes', async () => {
    const user = userEvent.setup();
    render(
      <Menu variant="context">
        <MenuTrigger asChild>
          <div>Right click target</div>
        </MenuTrigger>
        <MenuContent>
          <MenuItem data-testid="ctx-item">Label</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.pointer({ target: screen.getByText('Right click target'), keys: '[MouseRight]' });
    expect(screen.getByTestId('ctx-item')).toHaveClass('gap-2');
  });

  it('MenuItem in dropdown variant is clickable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Menu variant="dropdown" open onOpenChange={vi.fn()}>
        <MenuTrigger asChild>
          <button>Trigger</button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onClick={onClick}>Click me</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await user.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('MenuSeparator renders in dropdown variant', () => {
    render(
      <Menu variant="dropdown" open onOpenChange={vi.fn()}>
        <MenuTrigger asChild>
          <button>Trigger</button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem>Before</MenuItem>
          <MenuSeparator />
          <MenuItem>After</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
  });
});
