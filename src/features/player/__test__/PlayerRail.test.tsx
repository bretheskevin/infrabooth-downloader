import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPlayerState = { state: "playing" as string };

vi.mock("../store", () => ({
  usePlayerStore: (selector: (s: typeof mockPlayerState) => unknown) =>
    selector(mockPlayerState),
}));

vi.mock("../components/RailNowPlaying", () => ({
  RailNowPlaying: () => <div data-testid="rail-now-playing">Now Playing</div>,
}));

vi.mock("../components/RailQueue", () => ({
  RailQueue: () => <div data-testid="rail-queue">Queue</div>,
}));

import { PlayerRail } from "../components/PlayerRail";

describe("PlayerRail", () => {
  beforeEach(() => {
    mockPlayerState.state = "playing";
  });

  it("renders RailNowPlaying and RailQueue when playing", () => {
    render(<PlayerRail />);
    expect(screen.getByTestId("rail-now-playing")).toBeInTheDocument();
    expect(screen.getByTestId("rail-queue")).toBeInTheDocument();
  });

  it("renders nothing when state is stopped", () => {
    mockPlayerState.state = "stopped";
    const { container } = render(<PlayerRail />);
    expect(container.firstChild).toBeNull();
  });

  it("renders as an aside element", () => {
    const { container } = render(<PlayerRail />);
    expect(container.querySelector("aside")).toBeInTheDocument();
  });

  it("renders when state is paused", () => {
    mockPlayerState.state = "paused";
    render(<PlayerRail />);
    expect(screen.getByTestId("rail-now-playing")).toBeInTheDocument();
    expect(screen.getByTestId("rail-queue")).toBeInTheDocument();
  });
});
