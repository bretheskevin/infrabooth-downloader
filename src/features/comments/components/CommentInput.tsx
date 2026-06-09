import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CommentInputProps {
  onSubmit: (body: string) => void;
  placeholder: string;
  isSubmitting: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export function CommentInput({ onSubmit, placeholder, isSubmitting, autoFocus = false, onCancel }: CommentInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting}
        autoFocus={autoFocus}
        className="flex-1 h-8 text-sm"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={handleSubmit}
        disabled={!canSubmit}
        aria-label={t('comments.send')}
        className="h-8 w-8 shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
      {onCancel && (
        <Button size="icon" variant="ghost" onClick={onCancel} aria-label={t('comments.cancel')} className="h-8 w-8 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
