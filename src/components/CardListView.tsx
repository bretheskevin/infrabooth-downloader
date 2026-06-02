import { Fragment, type Key, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/features/settings';

interface CardListViewProps<T> {
  items: T[];
  getKey: (item: T) => Key;
  renderCard: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;
  className?: string;
}

export function CardListView<T>({ items, getKey, renderCard, renderRow, className }: CardListViewProps<T>) {
  const viewMode = useSettingsStore((s) => s.mediaViewMode);
  const isCard = viewMode === 'card';
  const containerClass = isCard ? 'grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3' : 'flex flex-col gap-1';
  const render = isCard ? renderCard : renderRow;

  return (
    <div className={cn(containerClass, className)}>
      {items.map((item) => (
        <Fragment key={getKey(item)}>{render(item)}</Fragment>
      ))}
    </div>
  );
}
