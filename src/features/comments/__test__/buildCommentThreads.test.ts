import { describe, it, expect } from 'vitest';
import { buildCommentThreads } from '../utils/buildCommentThreads';

const makeComment = ({ id, timestampMs, createdAt, body = '' }: { id: number; timestampMs: number; createdAt: string; body?: string }) => ({
  id,
  body,
  createdAt,
  timestampMs,
  user: { id: id * 100, username: `user-${id}`, avatar_url: null, permalink_url: `https://soundcloud.com/user-${id}` },
});

describe('buildCommentThreads', () => {
  it('returns an empty array for empty input', () => {
    const result = buildCommentThreads([]);
    expect(result).toEqual([]);
  });

  it('returns a single thread with no replies for one comment', () => {
    const comment = makeComment({ id: 1, timestampMs: 5000, createdAt: '2024-01-01T00:00:00Z' });

    const result = buildCommentThreads([comment]);

    expect(result).toHaveLength(1);
    expect(result[0]!.root.id).toBe(1);
    expect(result[0]!.replies).toHaveLength(0);
  });

  it('groups three comments with the same timestampMs into one thread with root as earliest createdAt', () => {
    const comments = [
      makeComment({ id: 1, timestampMs: 3000, createdAt: '2024-01-01T12:00:00Z' }),
      makeComment({ id: 2, timestampMs: 3000, createdAt: '2024-01-01T10:00:00Z' }),
      makeComment({ id: 3, timestampMs: 3000, createdAt: '2024-01-01T14:00:00Z' }),
    ];

    const result = buildCommentThreads(comments);

    expect(result).toHaveLength(1);
    expect(result[0]!.root.id).toBe(2);
    expect(result[0]!.replies).toHaveLength(2);
    expect(result[0]!.replies[0]!.id).toBe(1);
    expect(result[0]!.replies[1]!.id).toBe(3);
  });

  it('preserves first-appearance order for threads with different timestampMs', () => {
    const comments = [
      makeComment({ id: 1, timestampMs: 9000, createdAt: '2024-01-02T00:00:00Z' }),
      makeComment({ id: 2, timestampMs: 1000, createdAt: '2024-01-01T00:00:00Z' }),
    ];

    const result = buildCommentThreads(comments);

    expect(result).toHaveLength(2);
    expect(result[0]!.root.id).toBe(1);
    expect(result[1]!.root.id).toBe(2);
  });

  it('sorts replies by createdAt ascending within a thread even when input is out of order', () => {
    const comments = [
      makeComment({ id: 3, timestampMs: 5000, createdAt: '2024-01-03T00:00:00Z' }),
      makeComment({ id: 1, timestampMs: 5000, createdAt: '2024-01-01T00:00:00Z' }),
      makeComment({ id: 2, timestampMs: 5000, createdAt: '2024-01-02T00:00:00Z' }),
    ];

    const result = buildCommentThreads(comments);

    expect(result).toHaveLength(1);
    expect(result[0]!.root.id).toBe(1);
    expect(result[0]!.replies[0]!.id).toBe(2);
    expect(result[0]!.replies[1]!.id).toBe(3);
  });

  it('keeps untimed (timestampMs 0) comments as separate standalone threads', () => {
    const comments = [
      makeComment({ id: 1, timestampMs: 0, createdAt: '2024-01-01T00:00:00Z' }),
      makeComment({ id: 2, timestampMs: 0, createdAt: '2024-01-02T00:00:00Z' }),
      makeComment({ id: 3, timestampMs: 0, createdAt: '2024-01-03T00:00:00Z' }),
    ];

    const result = buildCommentThreads(comments);

    expect(result).toHaveLength(3);
    expect(result.map((thread) => thread.root.id)).toEqual([1, 2, 3]);
    result.forEach((thread) => expect(thread.replies).toHaveLength(0));
  });

  it('returns N threads each with 0 replies for N comments with distinct timestampMs', () => {
    const comments = [
      makeComment({ id: 1, timestampMs: 1000, createdAt: '2024-01-01T00:00:00Z' }),
      makeComment({ id: 2, timestampMs: 2000, createdAt: '2024-01-02T00:00:00Z' }),
      makeComment({ id: 3, timestampMs: 3000, createdAt: '2024-01-03T00:00:00Z' }),
    ];

    const result = buildCommentThreads(comments);

    expect(result).toHaveLength(3);
    result.forEach((thread) => {
      expect(thread.replies).toHaveLength(0);
    });
  });
});
