import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EqualizerSection } from '@/features/settings/components/EqualizerSection';
import { useSettingsStore } from '@/features/settings/store';
import {
  BUILT_IN_EQUALIZER_PRESETS,
  EQUALIZER_BAND_FREQUENCIES,
  EQUALIZER_MAX_GAIN_DB,
  formatBandFrequency,
  formatGain,
  presetGains,
} from '@/features/settings/utils/equalizerPresets';
import { EQUALIZER_GAIN_TICKS, EQUALIZER_GRAPH, gainToY } from '@/features/settings/utils/equalizerGraph';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'settings.equalizerBandLabel') return `${String(opts?.frequency)} Hz band`;
      const map: Record<string, string> = {
        'settings.equalizer': 'Equalizer',
        'settings.equalizerDescription': 'Shape the sound',
        'settings.equalizerPreset': 'Preset',
        'settings.equalizerReset': 'Reset',
        'settings.equalizerPresets.flat': 'Flat',
        'settings.equalizerPresets.bassBoost': 'Bass +',
        'settings.equalizerPresets.rock': 'Rock',
      };
      return map[key] ?? key;
    },
  }),
}));

const BAND_COUNT = EQUALIZER_BAND_FREQUENCIES.length;
const FLAT = presetGains('flat');
const ROCK = presetGains('rock');
const ALL_RAISED = FLAT.map(() => 2);

function bandName(index: number) {
  return `${formatBandFrequency(EQUALIZER_BAND_FREQUENCIES[index] ?? 0)} Hz band`;
}

function bandPoint(index: number) {
  return screen.getByRole('slider', { name: bandName(index) });
}

function gainsWith(index: number, db: number) {
  return FLAT.map((gain, i) => (i === index ? db : gain));
}

function mockGraphRect(point: HTMLElement) {
  const svg = point.closest('svg');
  if (!svg) throw new Error('equalizer graph not rendered');
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ top: 0, height: EQUALIZER_GRAPH.height } as DOMRect);
}

function dragTo(point: HTMLElement, db: number) {
  mockGraphRect(point);
  const startY = gainToY(Number(point.getAttribute('aria-valuenow')));
  fireEvent.pointerDown(point, { pointerId: 1, clientY: startY });
  fireEvent.pointerMove(point, { pointerId: 1, clientY: gainToY(db) });
}

describe('EqualizerSection', () => {
  beforeAll(() => {
    Element.prototype.setPointerCapture = vi.fn();
  });

  beforeEach(() => {
    useSettingsStore.setState({ equalizerEnabled: false, equalizerPreset: 'flat', equalizerGains: [...FLAT] });
  });

  it('keeps the graph, presets and reset visible but disabled while off', () => {
    render(<EqualizerSection />);
    expect(screen.getByRole('switch')).not.toBeChecked();
    const points = screen.getAllByRole('slider');
    expect(points).toHaveLength(BAND_COUNT);
    expect(points.every((point) => point.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(
      within(screen.getByRole('group', { name: 'Preset' }))
        .getAllByRole('button')
        .every((chip) => chip.hasAttribute('disabled')),
    ).toBe(true);
  });

  it('ignores dragging and double-clicking points while off', () => {
    useSettingsStore.setState({ equalizerPreset: 'custom', equalizerGains: [...ALL_RAISED] });
    render(<EqualizerSection />);
    const point = bandPoint(0);
    dragTo(point, -EQUALIZER_MAX_GAIN_DB);
    fireEvent.pointerUp(point, { pointerId: 1 });
    fireEvent.doubleClick(point);
    expect(useSettingsStore.getState().equalizerGains).toEqual(ALL_RAISED);
  });

  it('enables the equalizer from the switch', async () => {
    render(<EqualizerSection />);
    await userEvent.click(screen.getByRole('switch'));
    expect(useSettingsStore.getState().equalizerEnabled).toBe(true);
    expect(screen.getAllByRole('slider').every((point) => point.getAttribute('aria-disabled') === 'false')).toBe(true);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  it('renders one labelled point per band reflecting the store gains', () => {
    useSettingsStore.setState({ equalizerEnabled: true, equalizerGains: gainsWith(0, 3.5) });
    render(<EqualizerSection />);
    const points = screen.getAllByRole('slider');
    expect(points).toHaveLength(BAND_COUNT);
    expect(points.map((point) => point.getAttribute('aria-label'))).toEqual(EQUALIZER_BAND_FREQUENCIES.map((_, i) => bandName(i)));
    expect(bandPoint(0)).toHaveAttribute('aria-valuenow', '3.5');
    expect(bandPoint(0)).toHaveAttribute('aria-valuetext', '+3.5 dB');
  });

  it('labels the gain axis from +max to -max and every band frequency', () => {
    render(<EqualizerSection />);
    expect(screen.getByText(`+${EQUALIZER_MAX_GAIN_DB}`)).toBeInTheDocument();
    expect(screen.getByText(`-${EQUALIZER_MAX_GAIN_DB}`)).toBeInTheDocument();
    for (const label of [...EQUALIZER_GAIN_TICKS.map(formatGain), ...EQUALIZER_BAND_FREQUENCIES.map(formatBandFrequency)]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('limits band points to the gain range', () => {
    render(<EqualizerSection />);
    for (const point of screen.getAllByRole('slider')) {
      expect(point).toHaveAttribute('aria-valuemin', String(-EQUALIZER_MAX_GAIN_DB));
      expect(point).toHaveAttribute('aria-valuemax', String(EQUALIZER_MAX_GAIN_DB));
    }
  });

  it('updates the points when a preset is applied', () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    act(() => useSettingsStore.getState().setEqualizerPreset('trebleBoost'));
    const treble = presetGains('trebleBoost');
    expect(screen.getAllByRole('slider').map((point) => Number(point.getAttribute('aria-valuenow')))).toEqual(treble);
  });

  it('drags a point to a snapped gain and switches to custom', () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    dragTo(bandPoint(2), 3.3);
    expect(useSettingsStore.getState().equalizerGains[2]).toBe(3.5);
    expect(useSettingsStore.getState().equalizerPreset).toBe('custom');
  });

  it('moves a point relative to where it was grabbed', () => {
    useSettingsStore.setState({ equalizerEnabled: true, equalizerGains: gainsWith(2, 4) });
    render(<EqualizerSection />);
    const point = bandPoint(2);
    mockGraphRect(point);
    const grabY = gainToY(4) + 8;
    fireEvent.pointerDown(point, { pointerId: 1, clientY: grabY });
    fireEvent.pointerMove(point, { pointerId: 1, clientY: grabY + 1 });
    expect(useSettingsStore.getState().equalizerGains[2]).toBe(4);
    fireEvent.pointerMove(point, { pointerId: 1, clientY: grabY + gainToY(0) - gainToY(2) });
    expect(useSettingsStore.getState().equalizerGains[2]).toBe(2);
  });

  it('clamps a drag beyond the graph to the gain range', () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    dragTo(bandPoint(3), -3 * EQUALIZER_MAX_GAIN_DB);
    expect(useSettingsStore.getState().equalizerGains[3]).toBe(-EQUALIZER_MAX_GAIN_DB);
  });

  it('stops following the pointer once released', () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    const point = bandPoint(2);
    dragTo(point, 2);
    fireEvent.pointerUp(point, { pointerId: 1 });
    fireEvent.pointerMove(point, { pointerId: 1, clientY: gainToY(-3) });
    expect(useSettingsStore.getState().equalizerGains[2]).toBe(2);
  });

  it('shows the gain above a point while dragging', () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    const point = bandPoint(2);
    expect(screen.queryByText('+3.5 dB')).not.toBeInTheDocument();
    dragTo(point, 3.5);
    expect(within(point).getByText('+3.5 dB')).toBeInTheDocument();
    fireEvent.pointerUp(point, { pointerId: 1 });
    expect(screen.queryByText('+3.5 dB')).not.toBeInTheDocument();
  });

  it('shows the gain above a hovered point', () => {
    useSettingsStore.setState({ equalizerEnabled: true, equalizerGains: gainsWith(1, -2) });
    render(<EqualizerSection />);
    const point = bandPoint(1);
    fireEvent.pointerEnter(point);
    expect(within(point).getByText('-2 dB')).toBeInTheDocument();
    fireEvent.pointerLeave(point);
    expect(screen.queryByText('-2 dB')).not.toBeInTheDocument();
  });

  it('shows the gain above a focused point', () => {
    useSettingsStore.setState({ equalizerEnabled: true, equalizerGains: gainsWith(BAND_COUNT - 1, 1.5) });
    render(<EqualizerSection />);
    const point = bandPoint(BAND_COUNT - 1);
    act(() => point.focus());
    expect(within(point).getByText('+1.5 dB')).toBeInTheDocument();
  });

  it('resets a band to 0 dB on double-click', () => {
    useSettingsStore.setState({ equalizerEnabled: true, equalizerPreset: 'custom', equalizerGains: [...ALL_RAISED] });
    render(<EqualizerSection />);
    fireEvent.doubleClick(bandPoint(0));
    expect(useSettingsStore.getState().equalizerGains).toEqual([0, ...ALL_RAISED.slice(1)]);
  });

  it('resets to flat', async () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    useSettingsStore.getState().setEqualizerPreset('rock');
    render(<EqualizerSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(useSettingsStore.getState().equalizerGains).toEqual(FLAT);
    expect(useSettingsStore.getState().equalizerPreset).toBe('flat');
  });

  it('shows one chip per built-in preset with the active one pressed', () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    const chips = within(screen.getByRole('group', { name: 'Preset' })).getAllByRole('button');
    expect(chips).toHaveLength(BUILT_IN_EQUALIZER_PRESETS.length);
    expect(screen.getByRole('button', { name: 'Flat' })).toHaveAttribute('aria-pressed', 'true');
    expect(chips.filter((chip) => chip.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });

  it('applies a preset when its chip is clicked', async () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Rock' }));
    expect(useSettingsStore.getState().equalizerPreset).toBe('rock');
    expect(useSettingsStore.getState().equalizerGains).toEqual(ROCK);
    expect(screen.getByRole('button', { name: 'Rock' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Flat' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('applies a preset from the keyboard', async () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    render(<EqualizerSection />);
    screen.getByRole('button', { name: 'Bass +' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(useSettingsStore.getState().equalizerPreset).toBe('bassBoost');
  });

  it('presses no chip while the gains are custom', () => {
    useSettingsStore.setState({ equalizerEnabled: true, equalizerPreset: 'custom', equalizerGains: gainsWith(0, 1) });
    render(<EqualizerSection />);
    const chips = within(screen.getByRole('group', { name: 'Preset' })).getAllByRole('button');
    expect(chips).toHaveLength(BUILT_IN_EQUALIZER_PRESETS.length);
    expect(chips.every((chip) => chip.getAttribute('aria-pressed') === 'false')).toBe(true);
  });
});
