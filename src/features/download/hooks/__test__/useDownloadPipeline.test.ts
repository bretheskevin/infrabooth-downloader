import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDownloadPipeline } from '../useDownloadPipeline';

vi.mock('@/features/queue', async () => {
  const actual = await vi.importActual('@/features/queue');
  return {
    ...actual,
    useDownloadFlow: vi.fn(() => mockFlowState),
  };
});

const mockFlowState = {
  url: '',
  setUrl: vi.fn(),
  validation: null,
  isValidating: false,
  media: null,
  isLoading: false,
  error: null,
  isPending: false,
  handleDownload: vi.fn(),
};

describe('useDownloadPipeline', () => {
  it('always returns the flow object', () => {
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.flow).toBe(mockFlowState);
  });
});
