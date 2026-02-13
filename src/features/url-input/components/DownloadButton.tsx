import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface DownloadButtonProps {
  onDownload: () => void;
  isDownloading?: boolean;
}

export function DownloadButton({ onDownload, isDownloading }: DownloadButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      onClick={onDownload}
      disabled={isDownloading}
      className="flex-shrink-0"
      data-testid="download-button"
    >
      {isDownloading ? (
        <Spinner className="mr-2 h-4 w-4" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {isDownloading ? t('download.downloading') : t('download.button')}
    </Button>
  );
}
