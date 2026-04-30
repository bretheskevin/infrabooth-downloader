import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

const { mockUsePlayerEvents, mockUseKeyboardShortcuts } = vi.hoisted(() => ({
  mockUsePlayerEvents: vi.fn(),
  mockUseKeyboardShortcuts: vi.fn(),
}));

vi.mock("../hooks/usePlayerEvents", () => ({
  usePlayerEvents: mockUsePlayerEvents,
}));

vi.mock("../hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: mockUseKeyboardShortcuts,
}));

import { PlayerHooksProvider } from "../components/PlayerHooksProvider";

describe("PlayerHooksProvider", () => {
  it("calls usePlayerEvents and useKeyboardShortcuts", () => {
    render(<PlayerHooksProvider />);
    expect(mockUsePlayerEvents).toHaveBeenCalled();
    expect(mockUseKeyboardShortcuts).toHaveBeenCalled();
  });

  it("renders nothing", () => {
    const { container } = render(<PlayerHooksProvider />);
    expect(container.firstChild).toBeNull();
  });
});
