import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';

interface LibrarySearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function LibrarySearchBar({ value, onChange }: LibrarySearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('library.searchPlaceholder')}
        className="pl-9 pr-3 py-2.5"
      />
    </div>
  );
}
