import { useT } from '@/lib/translation';
import { Button } from '@/components/ui/button';

export interface FilterChipsProps<T extends string> {
  options: readonly { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}

export function FilterChips<T extends string>({ options, active, onChange }: FilterChipsProps<T>) {
  const t = useT();

  return (
    <div className="flex gap-2">
      {options.map(({ key, label }) => (
        <Button
          key={key}
          variant={active === key ? 'default' : 'secondary'}
          size="sm"
          className="rounded-full px-3.5"
          onClick={() => onChange(key)}
        >
          {t(label)}
        </Button>
      ))}
    </div>
  );
}
