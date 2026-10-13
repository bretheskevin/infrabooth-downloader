import { DEFAULT_VISUALIZER_SETTINGS, type RemoteCommand, type RemoteState, type VisualizerSettings } from '@/lib/remote-protocol';

export function useVisualizerSettings(
  state: Pick<RemoteState, 'visualizer'> | null,
  send: (cmd: RemoteCommand) => void,
): [VisualizerSettings, (next: VisualizerSettings) => void] {
  function update(next: VisualizerSettings) {
    send({ type: 'setVisualizerSettings', settings: next });
  }

  return [state?.visualizer ?? DEFAULT_VISUALIZER_SETTINGS, update];
}
