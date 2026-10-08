import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { playNow, sendWithToast } from "../lib/commands";
import type { Mix } from "../lib/mapping";
import { TrackListItem } from "./TrackListItem";

function MixTracks({ mix }: { mix: Mix }) {
  return (
    <List navigationTitle={mix.title} searchBarPlaceholder="Filter tracks…">
      {mix.tracks.map((track, index) => (
        <TrackListItem
          key={`${track.trackId}-${index}`}
          track={track}
          playContext={{ tracks: mix.tracks, startIndex: index }}
        />
      ))}
    </List>
  );
}

export function MixListItem({ mix, extraActions }: { mix: Mix; extraActions?: ReactNode }) {
  return (
    <List.Item
      title={mix.title}
      icon={mix.artworkUrl ?? Icon.Shuffle}
      accessories={[{ text: `${mix.tracks.length} tracks` }]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Tracks" icon={Icon.List} target={<MixTracks mix={mix} />} />
          <Action
            title="Add to Queue"
            icon={Icon.Plus}
            onAction={() =>
              sendWithToast({ type: "queueTracks", tracks: mix.tracks }, `Added ${mix.tracks.length} tracks to queue`)
            }
          />
          <Action title="Play Now" icon={Icon.Play} onAction={() => playNow(mix.tracks, 0)} />
          {extraActions && <ActionPanel.Section>{extraActions}</ActionPanel.Section>}
        </ActionPanel>
      }
    />
  );
}
