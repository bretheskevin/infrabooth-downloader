import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings/store';
import { EQUALIZER_MAX_GAIN_DB, formatBandFrequency, formatGain } from '@/features/settings/utils/equalizerPresets';
import { clientYToPlotY, yToGain } from '@/features/settings/utils/equalizerGraph';

interface EqualizerGraphPointProps {
  index: number;
  frequency: number;
  gain: number;
  x: number;
  y: number;
  disabled: boolean;
}

export function EqualizerGraphPoint({ index, frequency, gain, x, y, disabled }: EqualizerGraphPointProps) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const grabOffset = useRef(0);
  const valueText = `${formatGain(gain)} dB`;
  const active = !disabled && (dragging || hovered || focused);

  const setGain = (db: number) => {
    if (db !== gain) useSettingsStore.getState().setEqualizerBandGain(index, db);
  };

  const pointerPlotY = (e: React.PointerEvent<SVGGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    return svg ? clientYToPlotY(e.clientY, svg.getBoundingClientRect()) : null;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (disabled || e.button !== 0) return;
    const plotY = pointerPlotY(e);
    if (plotY === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    grabOffset.current = y - plotY;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!dragging || disabled) return;
    const plotY = pointerPlotY(e);
    if (plotY !== null) setGain(yToGain(plotY + grabOffset.current));
  };

  return (
    <g
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={t('settings.equalizerBandLabel', { frequency: formatBandFrequency(frequency) })}
      aria-orientation="vertical"
      aria-valuemin={-EQUALIZER_MAX_GAIN_DB}
      aria-valuemax={EQUALIZER_MAX_GAIN_DB}
      aria-valuenow={gain}
      aria-valuetext={valueText}
      aria-disabled={disabled}
      className="cursor-ns-resize outline-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onDoubleClick={() => !disabled && setGain(0)}
    >
      <circle cx={x} cy={y} r={12} className="fill-transparent" />
      {active && <circle cx={x} cy={y} r={9} className="fill-primary/20" />}
      <circle cx={x} cy={y} r={5} strokeWidth={2} className="fill-primary-foreground stroke-primary" />
      {active && (
        <text
          x={x}
          y={y - 13}
          textAnchor="middle"
          strokeWidth={3}
          strokeLinejoin="round"
          className="pointer-events-none fill-foreground stroke-card text-[11px] font-medium [paint-order:stroke]"
        >
          {valueText}
        </text>
      )}
    </g>
  );
}
