import { describe, it, expect } from 'vitest';
import { groupFailuresByReason } from './groupFailuresByReason';
import type { FailedTrack } from '@/types/download';
import type { ErrorCode } from '@/types/errors';

const createMockTrack = (
  id: string,
  errorCode: ErrorCode,
  errorMessage: string
): FailedTrack => ({
  id,
  title: `Track ${id}`,
  artist: `Artist ${id}`,
  error: { code: errorCode, message: errorMessage },
});

describe('groupFailuresByReason', () => {
  it('should categorize GEO_BLOCKED errors as geo_blocked', () => {
    const tracks = [
      createMockTrack('1', 'GEO_BLOCKED', 'Not available in your region'),
    ];

    const result = groupFailuresByReason(tracks);
    const geoBlocked = result.get('geo_blocked');

    expect(geoBlocked).toBeDefined();
    expect(geoBlocked).toHaveLength(1);
    expect(geoBlocked?.[0]?.id).toBe('1');
  });

  it('should categorize NETWORK_ERROR errors as network', () => {
    const tracks = [
      createMockTrack('1', 'NETWORK_ERROR', 'Connection failed'),
    ];

    const result = groupFailuresByReason(tracks);
    const network = result.get('network');

    expect(network).toBeDefined();
    expect(network).toHaveLength(1);
    expect(network?.[0]?.id).toBe('1');
  });

  it('should categorize DOWNLOAD_FAILED with unavailable message as unavailable', () => {
    const tracks = [
      createMockTrack('1', 'DOWNLOAD_FAILED', 'Track unavailable'),
    ];

    const result = groupFailuresByReason(tracks);
    const unavailable = result.get('unavailable');

    expect(unavailable).toBeDefined();
    expect(unavailable).toHaveLength(1);
    expect(unavailable?.[0]?.id).toBe('1');
  });

  it('should categorize DOWNLOAD_FAILED with private message as unavailable', () => {
    const tracks = [
      createMockTrack('1', 'DOWNLOAD_FAILED', 'This track is private'),
    ];

    const result = groupFailuresByReason(tracks);

    expect(result.get('unavailable')).toHaveLength(1);
  });

  it('should categorize DOWNLOAD_FAILED with removed message as unavailable', () => {
    const tracks = [
      createMockTrack('1', 'DOWNLOAD_FAILED', 'Track has been removed'),
    ];

    const result = groupFailuresByReason(tracks);

    expect(result.get('unavailable')).toHaveLength(1);
  });

  it('should categorize DOWNLOAD_FAILED without specific keywords as other', () => {
    const tracks = [
      createMockTrack('1', 'DOWNLOAD_FAILED', 'Unknown error occurred'),
    ];

    const result = groupFailuresByReason(tracks);

    expect(result.get('other')).toHaveLength(1);
  });

  it('should categorize unmatched error codes as other', () => {
    const tracks = [
      createMockTrack('1', 'CONVERSION_FAILED', 'Something went wrong'),
    ];

    const result = groupFailuresByReason(tracks);

    expect(result.get('other')).toHaveLength(1);
  });

  it('should group multiple tracks by their categories', () => {
    const tracks = [
      createMockTrack('1', 'GEO_BLOCKED', 'Not available'),
      createMockTrack('2', 'GEO_BLOCKED', 'Not available'),
      createMockTrack('3', 'NETWORK_ERROR', 'Connection failed'),
      createMockTrack('4', 'DOWNLOAD_FAILED', 'Track unavailable'),
    ];

    const result = groupFailuresByReason(tracks);

    expect(result.get('geo_blocked')).toHaveLength(2);
    expect(result.get('network')).toHaveLength(1);
    expect(result.get('unavailable')).toHaveLength(1);
  });

  it('should return empty map for empty input', () => {
    const result = groupFailuresByReason([]);
    expect(result.size).toBe(0);
  });

  it('should be case-insensitive when matching message keywords', () => {
    const tracks = [
      createMockTrack('1', 'DOWNLOAD_FAILED', 'TRACK UNAVAILABLE'),
      createMockTrack('2', 'DOWNLOAD_FAILED', 'This Is Private'),
    ];

    const result = groupFailuresByReason(tracks);

    expect(result.get('unavailable')).toHaveLength(2);
  });
});
