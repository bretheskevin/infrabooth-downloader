import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useQueueStore } from "@/features/queue/store";
import { Progress } from "@/components/ui/progress";

export function SidebarQueueWidget() {
  const { t } = useTranslation();

  const { tracks, currentIndex, totalTracks, isProcessing, completedCount } =
    useQueueStore(
      useShallow((s) => ({
        tracks: s.tracks,
        currentIndex: s.currentIndex,
        totalTracks: s.totalTracks,
        isProcessing: s.isProcessing,
        completedCount: s.completedCount,
      })),
    );

  if (!isProcessing) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {t("sidebar.noActiveDownload")}
        </p>
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];
  const percent = currentTrack?.percent ?? 0;

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium truncate">
          {currentTrack?.title}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {t("sidebar.queueProgress", {
            completed: completedCount,
            total: totalTracks,
          })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("sidebar.downloading")}
      </p>
      <Progress value={percent} className="h-1" />
    </div>
  );
}
