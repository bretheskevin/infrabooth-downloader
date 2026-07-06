export interface WaveformData {
  samples: number[];
}

export async function fetchWaveformSamples(url: string, signal: AbortSignal): Promise<number[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as WaveformData;
  return data.samples;
}

export interface DrawWaveformOptions {
  progress: number;
  width: number;
  height: number;
  playedColor: string;
  barColor: string;
  hoverProgress?: number | null;
  hoverBarColor?: string;
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  { progress, width, height, playedColor, barColor, hoverProgress, hoverBarColor }: DrawWaveformOptions,
): void {
  ctx.clearRect(0, 0, width, height);

  if (samples.length === 0) return;

  const centerY = height / 2;

  let maxSample = 1;
  for (const s of samples) {
    if (s > maxSample) maxSample = s;
  }

  const barWidth = 2;
  const gap = 1;
  const step = barWidth + gap;
  const barCount = Math.floor(width / step);
  const playedIndex = Math.floor(progress * barCount);
  const hoverIndex = hoverProgress != null ? Math.floor(hoverProgress * barCount) : -1;

  for (let i = 0; i < barCount; i++) {
    const sampleIndex = Math.floor((i / barCount) * samples.length);
    const sample = samples[sampleIndex] ?? 0;
    const normalized = sample / maxSample;

    const barHeight = Math.max(2, normalized * (height - 4));
    const halfBar = barHeight / 2;
    const x = i * step;

    if (i <= playedIndex) {
      ctx.fillStyle = playedColor;
    } else if (hoverIndex >= 0 && i <= hoverIndex && hoverBarColor != null) {
      ctx.fillStyle = hoverBarColor;
    } else {
      ctx.fillStyle = barColor;
    }
    ctx.fillRect(x, centerY - halfBar, barWidth, barHeight);
  }
}
