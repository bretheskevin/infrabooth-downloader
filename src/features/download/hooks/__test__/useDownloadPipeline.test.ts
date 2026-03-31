import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDownloadPipeline } from '../useDownloadPipeline';

const mockClearQueue = vi.fn();
const mockQueueState = {
  isProcessing: false,
  isInitializing: false,
};
vi.mock('@/features/queue', async () => {
  const actual = await vi.importActual('@/features/queue');
  const storeFn = vi.fn((selector: (s: typeof mockQueueState) => unknown) => selector(mockQueueState));
  return {
    ...actual,
    useQueueStore: Object.assign(storeFn, { getState: () => ({ clearQueue: mockClearQueue }) }),
    useDownloadFlow: vi.fn(() => mockFlowState),
    useDownloadCompletion: vi.fn(() => mockCompletionState),
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

const mockCompletionState = {
  isComplete: false,
  completedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
  totalCount: 0,
  hasFailures: false,
  isFullSuccess: false,
  isCancelled: false,
  resetQueue: vi.fn(),
};

function resetMocks() {
  mockQueueState.isProcessing = false;
  mockQueueState.isInitializing = false;
  mockFlowState.isPending = false;
  mockFlowState.setUrl.mockClear();
  mockClearQueue.mockClear();
  mockCompletionState.isComplete = false;
  mockCompletionState.resetQueue.mockClear();
}

describe('useDownloadPipeline', () => {
  beforeEach(resetMocks);

  it('returns main view by default', () => {
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.type).toBe('main');
    if (result.current.type === 'main') {
      expect(result.current.flow).toBe(mockFlowState);
    }
  });

  it('returns complete when isComplete is true', () => {
    mockCompletionState.isComplete = true;
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.type).toBe('complete');
  });

  it('returns processing when isProcessing is true', () => {
    mockQueueState.isProcessing = true;
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.type).toBe('processing');
  });

  it('returns pending when isPending is true', () => {
    mockFlowState.isPending = true;
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.type).toBe('pending');
  });

  it('returns pending when isInitializing is true', () => {
    mockQueueState.isInitializing = true;
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.type).toBe('pending');
  });

  it('complete takes priority over processing', () => {
    mockCompletionState.isComplete = true;
    mockQueueState.isProcessing = true;
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.type).toBe('complete');
  });

  it('processing takes priority over pending', () => {
    mockQueueState.isProcessing = true;
    mockFlowState.isPending = true;
    const { result } = renderHook(() => useDownloadPipeline());
    expect(result.current.type).toBe('processing');
  });

  it('onDownloadAnother resets queue and clears url', () => {
    mockCompletionState.isComplete = true;
    const { result } = renderHook(() => useDownloadPipeline());
    if (result.current.type === 'complete') {
      result.current.onDownloadAnother();
      expect(mockClearQueue).toHaveBeenCalled();
      expect(mockFlowState.setUrl).toHaveBeenCalledWith('');
    }
  });
});
