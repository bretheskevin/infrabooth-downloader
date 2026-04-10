import { describe, it, expect, beforeEach } from 'vitest';
import { seedFilePath, useDownloadStateStore } from '../useDownloadState';

describe('seedFilePath', () => {
  beforeEach(() => {
    useDownloadStateStore.setState({ states: new Map(), completedCount: 0 });
  });

  it('seeds filePath for a track with no existing state', () => {
    seedFilePath('123', '/downloads/track.mp3');

    const state = useDownloadStateStore.getState().states.get('123');
    expect(state).toEqual({ status: 'completed', filePath: '/downloads/track.mp3' });
  });

  it('seeds filePath for a track with existing state but no filePath', () => {
    useDownloadStateStore.setState({
      states: new Map([['123', { status: 'complete', percent: 1 }]]),
      completedCount: 1,
    });

    seedFilePath('123', '/downloads/track.mp3');

    const state = useDownloadStateStore.getState().states.get('123');
    expect(state).toEqual({ status: 'complete', percent: 1, filePath: '/downloads/track.mp3' });
  });

  it('does not overwrite existing filePath', () => {
    useDownloadStateStore.setState({
      states: new Map([['123', { status: 'complete', filePath: '/original.mp3' }]]),
      completedCount: 1,
    });

    seedFilePath('123', '/new-path.mp3');

    const state = useDownloadStateStore.getState().states.get('123');
    expect(state?.filePath).toBe('/original.mp3');
  });
});
