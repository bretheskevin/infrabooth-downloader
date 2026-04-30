import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrackMenuItems } from '@/components/TrackRowActions';
import type { LikeState } from '@/hooks/useLikeTrack';
import type { ShareTrackInfo } from '@/features/messages/store';
import { useMenuExclusivity } from '@/hooks/useMenuExclusivity';

interface TrackActionsDropdownProps {
  trackId: number;
  permalinkUrl: string;
  triggerClassName?: string;
  contentSide?: 'top' | 'bottom';
  contentAlign?: 'start' | 'end';
  onAddToQueue?: () => void;
  likeState?: LikeState;
  shareInfo?: ShareTrackInfo;
}

export function TrackActionsDropdown({
  trackId,
  permalinkUrl,
  triggerClassName,
  contentSide = 'top',
  contentAlign = 'end',
  onAddToQueue,
  likeState,
  shareInfo,
}: TrackActionsDropdownProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => setOpen(false), []);
  const claimMenu = useMenuExclusivity(closeMenu);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) claimMenu();
      setOpen(nextOpen);
    },
    [claimMenu]
  );

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={triggerClassName}
              aria-label={t('player.trackActions')}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('player.trackActions')}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side={contentSide} align={contentAlign}>
        <TrackMenuItems
          permalinkUrl={permalinkUrl}
          trackId={trackId}
          variant="dropdown"
          onCloseMenu={closeMenu}
          onAddToQueue={onAddToQueue}
          likeState={likeState}
          shareInfo={shareInfo}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
