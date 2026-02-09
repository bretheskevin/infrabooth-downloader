import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

export function UrlInput({ onUrlChange, disabled, className, isValidating: _isValidating, validationResult: _validationResult }: UrlInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

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
    <Input
      type="url"
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      placeholder={t('download.pasteUrl')}
      disabled={disabled}
      className={cn(
        'h-12 text-base',
        'focus-visible:ring-2 focus-visible:ring-indigo-500',
        className
      )}
      aria-label={t('download.pasteUrl')}
    />
  );
}
