import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../store';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const setVolume = (v: number) => usePlayerStore.getState().setVolume(v);

interface VolumeControlProps {
  className?: string;
}

export function VolumeControl({ className }: VolumeControlProps) {
  const { t } = useTranslation();
  const volume = usePlayerStore((s) => s.volume);
  const [prevVolume, setPrevVolume] = useState(1);

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume);
    }
  }, [volume, prevVolume]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={volume === 0 ? t('player.unmute') : t('player.mute')}>
        {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      <Slider
        aria-label={t('player.volume')}
        value={[volume]}
        max={1}
        step={0.01}
        onValueChange={([v]) => v !== undefined && setVolume(v)}
        className="w-24"
      />
    </div>
  );
}
