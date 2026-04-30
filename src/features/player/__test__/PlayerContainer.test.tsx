import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPlayerState = {
  state: "playing" as string,
  isExpanded: true,
  isQueueOpen: false,
  toggleQueue: vi.fn(),
};

vi.mock("../store", () => ({
  usePlayerStore: Object.assign(
    (selector: (s: typeof mockPlayerState) => unknown) =>
      selector(mockPlayerState),
    {
      getState: () => mockPlayerState,
    },
  ),
}));

vi.mock("../components/MiniPill", () => ({
  MiniPill: () => <div data-testid="mini-pill">MiniPill</div>,
}));

vi.mock("../components/ExpandedBar", () => ({
  ExpandedBar: () => <div data-testid="expanded-bar">ExpandedBar</div>,
}));

vi.mock("../components/QueuePanel", () => ({
  QueuePanel: () => <div data-testid="queue-panel">QueuePanel</div>,
}));

const mockUseIsWidescreen = vi.fn(() => false);
vi.mock("@/hooks/useIsWidescreen", () => ({
  useIsWidescreen: () => mockUseIsWidescreen(),
}));

import { PlayerContainer } from "../components/PlayerContainer";

describe("PlayerContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerState.state = "playing";
    mockPlayerState.isExpanded = true;
    mockPlayerState.isQueueOpen = false;
    mockUseIsWidescreen.mockReturnValue(false);
  });

  it("renders ExpandedBar when not widescreen and expanded", () => {
    render(<PlayerContainer />);
    expect(screen.getByTestId("expanded-bar")).toBeInTheDocument();
  });

  it("renders nothing when widescreen", () => {
    mockUseIsWidescreen.mockReturnValue(true);
    const { container } = render(<PlayerContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when stopped", () => {
    mockPlayerState.state = "stopped";
    const { container } = render(<PlayerContainer />);
    expect(container.firstChild).toBeNull();
  });

  it("does not render ExpandedBar when widescreen", () => {
    mockUseIsWidescreen.mockReturnValue(true);
    render(<PlayerContainer />);
    expect(screen.queryByTestId("expanded-bar")).not.toBeInTheDocument();
  });

  it("does not render MiniPill when widescreen", () => {
    mockPlayerState.isExpanded = false;
    mockUseIsWidescreen.mockReturnValue(true);
    render(<PlayerContainer />);
    expect(screen.queryByTestId("mini-pill")).not.toBeInTheDocument();
  });

  it("closes queue overlay when transitioning to widescreen with queue open", async () => {
    mockPlayerState.isQueueOpen = true;
    const { rerender } = render(<PlayerContainer />);

    mockUseIsWidescreen.mockReturnValue(true);
    rerender(<PlayerContainer />);

    expect(mockPlayerState.toggleQueue).toHaveBeenCalled();
  });
});
