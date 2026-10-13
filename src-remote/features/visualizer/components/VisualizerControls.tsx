import { useState, type PointerEvent } from 'react';
import { Maximize, Minimize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { VISUALIZER_STYLE_IDS, type VisualizerSettings, type VisualizerStyle } from '@/lib/remote-protocol';
import { t } from '@remote/lib/i18n';
import PanelIconButton from '@remote/components/PanelIconButton';
import { isFullscreenSupported, isStandaloneWebApp, toggleAppFullscreen, useIsFullscreen } from '../hooks/useFullscreen';
import type { VisualizerToggle } from '../utils/visualizerSettings';

const STYLE_LABEL_KEYS: Record<VisualizerStyle, string> = {
  bars: 'visualizerStyleBars',
  mirrored: 'visualizerStyleMirrored',
  radial: 'visualizerStyleRadial',
  wave: 'visualizerStyleWave',
};

const TOGGLES: { key: VisualizerToggle; labelKey: string }[] = [
  { key: 'showTrackInfo', labelKey: 'visualizerTrackInfo' },
  { key: 'blurredBackground', labelKey: 'visualizerBlurredBackground' },
  { key: 'artworkColor', labelKey: 'visualizerArtworkColor' },
];

const ON_DARK_CLASS = 'text-white hover:bg-white/10 hover:text-white';

interface Props {
  settings: VisualizerSettings;
  language: string;
  onChange: (next: VisualizerSettings) => void;
  onExit: () => void;
  onInteract: () => void;
}

export default function VisualizerControls({ settings, language, onChange, onExit, onInteract }: Props) {
  const isFullscreen = useIsFullscreen();
  const [hintOpen, setHintOpen] = useState(false);
  const fullscreenSupported = isFullscreenSupported();
  const showFullscreenButton = fullscreenSupported || !isStandaloneWebApp();

  function handleFullscreenClick() {
    if (fullscreenSupported) toggleAppFullscreen();
    else setHintOpen((open) => !open);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    onInteract();
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute inset-x-0 top-0 flex flex-col gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] animate-in fade-in"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t('visualizer', language)}</p>
        <div className="flex items-center gap-1">
          {showFullscreenButton && (
            <PanelIconButton
              className={ON_DARK_CLASS}
              aria-label={t(isFullscreen ? 'visualizerExitFullscreen' : 'visualizerEnterFullscreen', language)}
              aria-expanded={fullscreenSupported ? undefined : hintOpen}
              onClick={handleFullscreenClick}
            >
              {isFullscreen ? <Minimize /> : <Maximize />}
            </PanelIconButton>
          )}
          <PanelIconButton className={ON_DARK_CLASS} aria-label={t('visualizerExit', language)} onClick={onExit}>
            <X />
          </PanelIconButton>
        </div>
      </div>
      {hintOpen && <p className="max-w-sm text-sm text-white/80">{t('visualizerFullscreenHint', language)}</p>}
      <div className="flex flex-wrap gap-2">
        {VISUALIZER_STYLE_IDS.map((style) => (
          <Button
            key={style}
            size="sm"
            variant={settings.style === style ? 'default' : 'outline'}
            aria-pressed={settings.style === style}
            className="rounded-full"
            onClick={() => onChange({ ...settings, style })}
          >
            {t(STYLE_LABEL_KEYS[style], language)}
          </Button>
        ))}
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        {TOGGLES.map(({ key, labelKey }) => (
          <label key={key} className="flex items-center justify-between gap-3 text-sm">
            <span>{t(labelKey, language)}</span>
            <Switch checked={settings[key]} onCheckedChange={(checked) => onChange({ ...settings, [key]: checked })} />
          </label>
        ))}
      </div>
    </div>
  );
}
