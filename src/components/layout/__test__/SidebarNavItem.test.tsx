import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarNavItem } from "../SidebarNavItem";
import { Link } from "lucide-react";

describe("SidebarNavItem", () => {
  const defaultProps = {
    icon: Link,
    label: "Download",
    active: false,
    onClick: vi.fn(),
  };

  it("should render icon and label", () => {
    render(<SidebarNavItem {...defaultProps} />);
    expect(screen.getByText("Download")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const onClick = vi.fn();
    render(<SidebarNavItem {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should apply active styles when active", () => {
    render(<SidebarNavItem {...defaultProps} active={true} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-primary/10");
    expect(button.className).toContain("text-primary");
  });

  it("should apply inactive styles when not active", () => {
    render(<SidebarNavItem {...defaultProps} active={false} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("text-foreground/80");
  });

  it("should show active indicator bar when active", () => {
    const { container } = render(
      <SidebarNavItem {...defaultProps} active={true} />,
    );
    const indicator = container.querySelector(
      '[data-testid="active-indicator"]',
    );
    expect(indicator).toBeInTheDocument();
    expect(indicator?.className).toContain("bg-primary");
  });

  it("should hide indicator bar when inactive", () => {
    const { container } = render(
      <SidebarNavItem {...defaultProps} active={false} />,
    );
    const indicator = container.querySelector(
      '[data-testid="active-indicator"]',
    );
    expect(indicator?.className).toContain("invisible");
  });

  it("should render numeric badge", () => {
    render(<SidebarNavItem {...defaultProps} badge={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should render dot badge", () => {
    const { container } = render(
      <SidebarNavItem {...defaultProps} badge="dot" />,
    );
    const dot = container.querySelector('[data-testid="dot-badge"]');
    expect(dot).toBeInTheDocument();
  });

  it("should be disabled and muted when locked", () => {
    const onClick = vi.fn();
    render(<SidebarNavItem {...defaultProps} locked onClick={onClick} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should show lock icon when locked", () => {
    const { container } = render(<SidebarNavItem {...defaultProps} locked />);
    const lockIcon = container.querySelector('[data-testid="lock-icon"]');
    expect(lockIcon).toBeInTheDocument();
  });
});
