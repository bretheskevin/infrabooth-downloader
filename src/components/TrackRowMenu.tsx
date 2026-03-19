import { MoreVertical, Link, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTrackActions } from '@/hooks/useTrackActions';
import type { TrackInfo } from '@/bindings';

interface TrackRowMenuProps {
  track: TrackInfo;
  className?: string;
}

export function TrackRowMenu({ track, className }: TrackRowMenuProps) {
  const { t } = useTranslation();
  const { handleCopyLink, handleOpenInBrowser } = useTrackActions(track.permalink_url);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link className="mr-2 h-4 w-4" />
          {t('trackMenu.copyLink')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInBrowser}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('trackMenu.openInBrowser')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
