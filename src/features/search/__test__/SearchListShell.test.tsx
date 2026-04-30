import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchListShell } from "../components/SearchListShell";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/useInfiniteScroll", () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock("@/lib/tauri", () => ({
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

const mockUseIsWidescreen = vi.fn(() => false);
vi.mock("@/hooks/useIsWidescreen", () => ({
  useIsWidescreen: () => mockUseIsWidescreen(),
}));

const defaultProps = {
  hasSearched: true,
  isLoading: false,
  error: null,
  resultsCount: 2,
  emptyStateMessage: "Search for something",
  noResultsMessage: "No results",
  fallbackErrorMessage: "Something went wrong",
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
};

describe("SearchListShell", () => {
  beforeEach(() => {
    mockUseIsWidescreen.mockReturnValue(false);
  });

  it("renders children in a plain div when not widescreen", () => {
    const { container } = render(
      <SearchListShell {...defaultProps}>
        <div data-testid="child">Item</div>
      </SearchListShell>,
    );
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toBe("");
  });

  it("renders children in a grid when widescreen", () => {
    mockUseIsWidescreen.mockReturnValue(true);
    const { container } = render(
      <SearchListShell {...defaultProps}>
        <div data-testid="child">Item</div>
      </SearchListShell>,
    );
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toContain("grid");
    expect(wrapper.className).toContain(
      "grid-cols-[repeat(auto-fill,minmax(440px,1fr))]",
    );
    expect(wrapper.className).toContain("gap-x-4");
  });

  it("does not apply grid classes to non-results states", () => {
    mockUseIsWidescreen.mockReturnValue(true);
    render(
      <SearchListShell {...defaultProps} hasSearched={false}>
        <div>Item</div>
      </SearchListShell>,
    );
    const emptyState = screen.getByText("Search for something");
    expect(emptyState.closest("div")?.className).not.toContain("grid");
  });
});
