import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  locked?: boolean;
  badge?: number | "dot";
  onClick: () => void;
}

export function SidebarNavItem({
  icon: Icon,
  label,
  active,
  locked,
  badge,
  onClick,
}: SidebarNavItemProps) {
  return (
    <div className="flex items-center gap-0">
      <div
        data-testid="active-indicator"
        className={cn(
          "w-[3px] h-5 rounded-full shrink-0",
          active ? "bg-primary" : "invisible",
        )}
      />
      <button
        type="button"
        disabled={locked}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors",
          active && "bg-primary/10 text-primary font-medium",
          !active && !locked && "text-foreground/80 hover:bg-secondary",
          locked && "text-muted-foreground/50 cursor-not-allowed",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
        <span className="ml-auto flex items-center">
          {locked && (
            <Lock
              data-testid="lock-icon"
              className="size-3.5 text-muted-foreground/50"
            />
          )}
          {!locked && badge !== undefined && badge !== "dot" && (
            <span className="min-w-[18px] text-center text-xs font-medium bg-primary/15 text-primary rounded-full px-1">
              {badge}
            </span>
          )}
          {!locked && badge === "dot" && (
            <span
              data-testid="dot-badge"
              className="size-2 rounded-full bg-primary"
            />
          )}
        </span>
      </button>
    </div>
  );
}
