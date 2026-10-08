import { describe, expect, it, vi } from "vitest";
import { ApiError, handleStreamLine } from "../api";

describe("handleStreamLine", () => {
  it("forwards batch items without completing", () => {
    const onBatch = vi.fn();
    expect(handleStreamLine("/api/x", '{"type":"batch","items":[1,2]}', onBatch)).toBeUndefined();
    expect(onBatch).toHaveBeenCalledWith([1, 2]);
  });

  it("returns the full list on done", () => {
    expect(handleStreamLine("/api/x", '{"type":"done","items":[3]}', vi.fn())).toEqual([3]);
  });

  it("throws an ApiError carrying the backend message on error", () => {
    const run = () => handleStreamLine("/api/x", '{"type":"error","message":"rate limited"}', vi.fn());
    expect(run).toThrow(ApiError);
    expect(run).toThrow("/api/x failed: rate limited");
  });
});

describe("ApiError detail", () => {
  it("exposes the backend detail separately from the message", () => {
    const error = new ApiError("/api/resolve-link", 400, "Not a SoundCloud URL");
    expect(error.detail).toBe("Not a SoundCloud URL");
    expect(error.message).toBe("/api/resolve-link failed: Not a SoundCloud URL");
  });
});
