import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ValidationResult } from '@/types/url';

interface UrlInputProps {
  onUrlChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
  isValidating?: boolean;
  validationResult?: ValidationResult | null;
}

export function UrlInput({ onUrlChange, disabled, className, isValidating, validationResult }: UrlInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const borderClass = useMemo(() => {
    if (isValidating) return 'border-indigo-400 ring-1 ring-indigo-400';
    if (!validationResult) return '';
    if (validationResult.valid) return 'border-emerald-500 ring-1 ring-emerald-500';
    return 'border-red-500 ring-1 ring-red-500';
  }, [isValidating, validationResult]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onUrlChange(newValue);
  }, [onUrlChange]);

  const handlePaste = useCallback((_e: React.ClipboardEvent<HTMLInputElement>) => {
    // Let the change event handle it, but we can add analytics here
    // Validation will be triggered by onChange
  }, []);

  return (
    <div className="relative">
      <Input
        type="url"
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={t('download.pasteUrl')}
        disabled={disabled}
        className={cn(
          'h-12 text-base transition-colors duration-200',
          'focus-visible:ring-2 focus-visible:ring-indigo-500',
          borderClass,
          className
        )}
        aria-label={t('download.pasteUrl')}
      />
      {isValidating && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        </div>
      )}
    </div>
  );
}
