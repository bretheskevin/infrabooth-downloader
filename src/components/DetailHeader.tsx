import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DetailHeaderProps {
  onBack?: () => void;
  backLabel?: string;
  navigation?: React.ReactNode;
  artwork: React.ReactNode;
  title: React.ReactNode;
  onTitleClick?: () => void;
  subtitle?: React.ReactNode;
  folderMetadata?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DetailHeader({
  onBack,
  backLabel,
  navigation,
  artwork,
  title,
  onTitleClick,
  subtitle,
  folderMetadata,
  actions,
  children,
}: DetailHeaderProps) {
  const { t } = useTranslation();

  const subtitleNode = subtitle ? <p className="text-xs text-muted-foreground truncate min-w-0">{subtitle}</p> : null;

  return (
    <div className="space-y-2">
      {navigation ??
        (onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel ?? t('common.back')}
          </Button>
        ))}
      <div className="flex items-center gap-3">
        {artwork}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold truncate leading-tight">
            {onTitleClick ? (
              <button type="button" onClick={onTitleClick} className="hover:underline cursor-pointer text-left">
                {title}
              </button>
            ) : (
              title
            )}
          </h2>
          {subtitleNode}
        </div>
        {actions}
      </div>
      {folderMetadata && <div className="flex items-center gap-1 text-xs">{folderMetadata}</div>}
      {children}
    </div>
  );
}
