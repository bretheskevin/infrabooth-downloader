import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === "player.nextUp") return "Next up";
      if (
        key === "player.queueCount" ||
        key === "player.queueCount_one" ||
        key === "player.queueCount_other"
      )
        return `${opts?.count ?? 0} tracks`;
      if (key === "player.queueEmpty") return "Queue is empty";
      return key;
    },
  }),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: "vertical",
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

vi.mock("@/hooks/useVirtualizedList", () => ({
  useVirtualizedList: vi.fn(() => ({
    parentRef: { current: null },
    virtualItems: [],
    totalSize: 0,
  })),
}));

vi.mock("@/components/ui/virtual-list", () => ({
  VirtualListContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="virtual-list">{children}</div>
  ),
  VirtualRow: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../components/QueuePanelItem", () => ({
  QueuePanelItem: ({
    item,
    isCurrent,
  }: {
    item: { title: string };
    isCurrent: boolean;
  }) => (
    <div data-testid="queue-item" data-current={isCurrent || undefined}>
      {item.title}
    </div>
  ),
}));

const mockState = {
  queue: [] as Array<{
    trackId: number;
    title: string;
    artist: string;
    artworkUrl: string | null;
    durationMs: number;
  }>,
  cursor: -1,
  state: "playing" as const,
  manualQueueCount: 0,
  stationQueueCount: 0,
};

vi.mock("../store", () => ({
  usePlayerStore: (selector: (s: typeof mockState) => unknown) =>
    selector(mockState),
}));

import { RailQueue } from "../components/RailQueue";
import { useVirtualizedList } from "@/hooks/useVirtualizedList";

describe("RailQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.queue = [];
    mockState.cursor = -1;
    mockState.state = "playing";
    mockState.manualQueueCount = 0;
    mockState.stationQueueCount = 0;
  });

  it("renders the header with nextUp label", () => {
    render(<RailQueue />);
    expect(screen.getByText("Next up")).toBeInTheDocument();
  });

  it("shows empty message when queue is empty", () => {
    render(<RailQueue />);
    expect(screen.getByText("Queue is empty")).toBeInTheDocument();
  });

  it("shows queue count", () => {
    mockState.queue = [
      {
        trackId: 1,
        title: "Track 1",
        artist: "Artist 1",
        artworkUrl: null,
        durationMs: 180000,
      },
      {
        trackId: 2,
        title: "Track 2",
        artist: "Artist 2",
        artworkUrl: null,
        durationMs: 200000,
      },
    ];
    vi.mocked(useVirtualizedList).mockReturnValue({
      parentRef: { current: null },
      virtualItems: [
        { index: 0, size: 44, start: 0, key: 0, end: 44, lane: 0 },
        { index: 1, size: 44, start: 44, key: 1, end: 88, lane: 0 },
      ],
      totalSize: 88,
      getScrollOffset: () => 0,
    });

    render(<RailQueue />);
    expect(screen.getByText("2 tracks")).toBeInTheDocument();
  });

  it("renders DndContext when queue has items", () => {
    mockState.queue = [
      {
        trackId: 1,
        title: "Track 1",
        artist: "Artist 1",
        artworkUrl: null,
        durationMs: 180000,
      },
    ];
    vi.mocked(useVirtualizedList).mockReturnValue({
      parentRef: { current: null },
      virtualItems: [
        { index: 0, size: 44, start: 0, key: 0, end: 44, lane: 0 },
      ],
      totalSize: 44,
      getScrollOffset: () => 0,
    });

    render(<RailQueue />);
    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
  });

  it("does not render DndContext when queue is empty", () => {
    render(<RailQueue />);
    expect(screen.queryByTestId("dnd-context")).not.toBeInTheDocument();
  });

  it("renders queue items via QueuePanelItem", () => {
    mockState.queue = [
      {
        trackId: 1,
        title: "Song A",
        artist: "Artist 1",
        artworkUrl: null,
        durationMs: 180000,
      },
      {
        trackId: 2,
        title: "Song B",
        artist: "Artist 2",
        artworkUrl: null,
        durationMs: 200000,
      },
    ];
    mockState.cursor = 0;
    vi.mocked(useVirtualizedList).mockReturnValue({
      parentRef: { current: null },
      virtualItems: [
        { index: 0, size: 44, start: 0, key: 0, end: 44, lane: 0 },
        { index: 1, size: 44, start: 44, key: 1, end: 88, lane: 0 },
      ],
      totalSize: 88,
      getScrollOffset: () => 0,
    });

    render(<RailQueue />);
    const items = screen.getAllByTestId("queue-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Song A");
    expect(items[1]).toHaveTextContent("Song B");
  });

  it("marks the current track", () => {
    mockState.queue = [
      {
        trackId: 1,
        title: "Song A",
        artist: "Artist 1",
        artworkUrl: null,
        durationMs: 180000,
      },
      {
        trackId: 2,
        title: "Song B",
        artist: "Artist 2",
        artworkUrl: null,
        durationMs: 200000,
      },
    ];
    mockState.cursor = 0;
    vi.mocked(useVirtualizedList).mockReturnValue({
      parentRef: { current: null },
      virtualItems: [
        { index: 0, size: 44, start: 0, key: 0, end: 44, lane: 0 },
        { index: 1, size: 44, start: 44, key: 1, end: 88, lane: 0 },
      ],
      totalSize: 88,
      getScrollOffset: () => 0,
    });

    render(<RailQueue />);
    const items = screen.getAllByTestId("queue-item");
    expect(items[0]).toHaveAttribute("data-current");
    expect(items[1]).not.toHaveAttribute("data-current");
  });
});
