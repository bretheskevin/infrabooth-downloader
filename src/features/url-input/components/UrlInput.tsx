import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardPaste } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ValidationResult } from '@/features/url-input/types/url';

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
    if (isValidating) return 'border-primary ring-1 ring-primary';
    if (!validationResult) return '';
    if (validationResult.valid) return 'border-success ring-1 ring-success';
    return 'border-destructive ring-1 ring-destructive';
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

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await readText();
      if (text) {
        setValue(text);
        onUrlChange(text);
      }
    } catch {
      // Clipboard access denied or not supported
    }
  }, [onUrlChange]);

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
          'h-12 text-base transition-colors duration-200 pr-12',
          'focus-visible:ring-2 focus-visible:ring-primary',
          borderClass,
          className
        )}
        aria-label={t('download.pasteUrl')}
      />
      {isValidating && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Spinner className="h-5 w-5 text-primary" />
        </div>
      )}
      {!isValidating && !disabled && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePasteFromClipboard}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground"
                aria-label={t('download.pasteButton')}
              >
                <ClipboardPaste className="h-5 w-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('download.pasteButton')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
