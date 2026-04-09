import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArtistAvatarImage } from '@/components/ArtistAvatarImage';

interface ProfileBannerProps {
  onBack: () => void;
  isLoading: boolean;
  bannerUrl: string | null;
  avatarUrl: string | null;
  username: string;
}

export function ProfileBanner({ onBack, isLoading, bannerUrl, avatarUrl, username }: ProfileBannerProps) {
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground self-start"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </Button>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <div className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
          {bannerUrl && (
            <img src={bannerUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center">
            <div className="flex items-center gap-2.5 backdrop-blur-sm bg-black/50 rounded-lg px-4 py-1.5 ml-3">
              <ArtistAvatarImage
                avatarUrl={avatarUrl}
                username={username}
                className="w-9 h-9 ring-2 ring-white/20 shrink-0"
              />
              <h2 className="text-sm font-bold text-white truncate drop-shadow-sm max-w-56">
                {username}
              </h2>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
