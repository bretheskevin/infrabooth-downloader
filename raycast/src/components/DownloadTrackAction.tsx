import { Action, Icon } from "@raycast/api";
import { sendWithToast } from "../lib/commands";
import type { RemoteTrack } from "@/lib/remote-protocol";

export function DownloadTrackAction({ track }: { track: RemoteTrack }) {
  return (
    <Action
      title="Download"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => sendWithToast({ type: "downloadTrack", track }, `Downloading “${track.title}”`)}
    />
  );
}
