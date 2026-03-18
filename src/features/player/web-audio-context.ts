import { logger } from '@/lib/logger';

export interface WebAudioNodes {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  gain: GainNode;
  eqFilters: BiquadFilterNode[];
}

export const EQ_BANDS = [
  { frequency: 60, type: 'lowshelf' as const, label: '60' },
  { frequency: 150, type: 'peaking' as const, label: '150' },
  { frequency: 400, type: 'peaking' as const, label: '400' },
  { frequency: 1000, type: 'peaking' as const, label: '1k' },
  { frequency: 2400, type: 'peaking' as const, label: '2.4k' },
  { frequency: 15000, type: 'highshelf' as const, label: '15k' },
] as const;

let nodes: WebAudioNodes | null = null;
let connectedElement: HTMLAudioElement | null = null;

export function getWebAudioNodes(): WebAudioNodes | null {
  return nodes;
}

export function initWebAudio(audioElement: HTMLAudioElement): WebAudioNodes {
  if (nodes && connectedElement === audioElement) {
    return nodes;
  }

  if (nodes) {
    destroyWebAudio();
  }

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContextClass();

  const source = context.createMediaElementSource(audioElement);
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  const gain = context.createGain();

  const eqFilters = EQ_BANDS.map((band) => {
    const filter = context.createBiquadFilter();
    filter.type = band.type;
    filter.frequency.value = band.frequency;
    filter.gain.value = 0;
    if (band.type === 'peaking') {
      filter.Q.value = 1;
    }
    return filter;
  });

  source.connect(eqFilters[0]!);
  for (let i = 0; i < eqFilters.length - 1; i++) {
    eqFilters[i]!.connect(eqFilters[i + 1]!);
  }
  eqFilters[eqFilters.length - 1]!.connect(analyser);
  analyser.connect(gain);
  gain.connect(context.destination);

  connectedElement = audioElement;
  nodes = { context, source, analyser, gain, eqFilters };

  return nodes;
}

export function destroyWebAudio(): void {
  if (nodes) {
    void nodes.context.close().catch((e) => void logger.warn('Failed to close AudioContext', e));
    nodes = null;
    connectedElement = null;
  }
}

export function resumeAudioContext(): Promise<void> {
  if (nodes?.context.state === 'suspended') {
    return nodes.context.resume();
  }
  return Promise.resolve();
}

export function getFrequencyData(): Uint8Array | null {
  if (!nodes) return null;
  const data = new Uint8Array(nodes.analyser.frequencyBinCount);
  nodes.analyser.getByteFrequencyData(data);
  return data;
}

export function setEqBandGain(bandIndex: number, gainDb: number): void {
  if (!nodes || !nodes.eqFilters[bandIndex]) return;
  nodes.eqFilters[bandIndex].gain.value = Math.max(-12, Math.min(12, gainDb));
}

export function setMasterGain(volume: number): void {
  if (!nodes) return;
  nodes.gain.gain.value = Math.max(0, Math.min(1, volume));
}
