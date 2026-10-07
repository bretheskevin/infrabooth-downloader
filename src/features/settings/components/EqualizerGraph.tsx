import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/features/settings/store';
import { EQUALIZER_BAND_FREQUENCIES, formatBandFrequency, formatGain } from '@/features/settings/utils/equalizerPresets';
import { EQUALIZER_GAIN_TICKS, EQUALIZER_GRAPH, bandX, gainToY, smoothCurvePath } from '@/features/settings/utils/equalizerGraph';
import { EqualizerGraphPoint } from './EqualizerGraphPoint';

const { width, height, plotLeft, plotRight, plotTop, plotBottom } = EQUALIZER_GRAPH;

export function EqualizerGraph({ disabled }: { disabled: boolean }) {
  const gains = useSettingsStore((s) => s.equalizerGains);
  const points = EQUALIZER_BAND_FREQUENCIES.map((frequency, index) => {
    const gain = gains[index] ?? 0;
    return { frequency, gain, x: bandX(index), y: gainToY(gain) };
  });

  return (
    <div className={cn('rounded-lg border bg-card p-2 transition-opacity', disabled && 'pointer-events-none opacity-50')}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full select-none">
        <EqualizerGraphAxes />
        <path d={smoothCurvePath(points)} strokeWidth={2} strokeLinecap="round" className="fill-none stroke-primary" />
        {points.map(({ frequency, gain, x, y }, index) => (
          <EqualizerGraphPoint key={frequency} index={index} frequency={frequency} gain={gain} x={x} y={y} disabled={disabled} />
        ))}
      </svg>
    </div>
  );
}

function EqualizerGraphAxes() {
  return (
    <g aria-hidden="true" className="text-[10px]">
      {EQUALIZER_GAIN_TICKS.map((tick) => {
        const y = gainToY(tick);
        return (
          <g key={tick}>
            <line x1={plotLeft} x2={plotRight} y1={y} y2={y} strokeDasharray="3 4" className="stroke-border" />
            <text x={plotLeft - 10} y={y} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground">
              {formatGain(tick)}
            </text>
          </g>
        );
      })}
      {EQUALIZER_BAND_FREQUENCIES.map((frequency, index) => {
        const x = bandX(index);
        return (
          <g key={frequency}>
            <line x1={x} x2={x} y1={plotTop} y2={plotBottom} className="stroke-border/60" />
            <text x={x} y={plotBottom + 18} textAnchor="middle" className="fill-muted-foreground">
              {formatBandFrequency(frequency)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
