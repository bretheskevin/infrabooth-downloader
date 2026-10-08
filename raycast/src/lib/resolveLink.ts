import type { TrackInfo } from "@/bindings";
import type { RemoteTrack } from "@/lib/remote-protocol";
import { mapTrack } from "@remote/lib/trackMapping";

export interface PlaylistInfoJson {
  id: number;
  title: string;
  user: { id: number; username: string; avatar_url: string | null };
  artwork_url: string | null;
  track_count: number;
  tracks: TrackInfo[];
}

export type ResolvedLinkJson = { kind: "track"; track: TrackInfo } | { kind: "playlist"; playlist: PlaylistInfoJson };

export interface ResolvedPlaylist {
  title: string;
  owner: string;
  artworkUrl: string | null;
  trackCount: number;
  tracks: TrackInfo[];
}

export type ResolvedLink =
  | { kind: "track"; track: RemoteTrack; secretToken: string | null; downloadUrl: string | null }
  | { kind: "playlist"; playlist: ResolvedPlaylist };

export function mapResolvedLink(json: ResolvedLinkJson): ResolvedLink {
  if (json.kind === "track") {
    return {
      kind: "track",
      track: mapTrack(json.track),
      secretToken: json.track.secret_token ?? null,
      downloadUrl: json.track.download_url ?? null,
    };
  }
  const { playlist } = json;
  return {
    kind: "playlist",
    playlist: {
      title: playlist.title,
      owner: playlist.user.username,
      artworkUrl: playlist.artwork_url,
      trackCount: playlist.track_count,
      tracks: playlist.tracks,
    },
  };
}

export function resolvedTitle(link: ResolvedLink): string {
  return link.kind === "track" ? link.track.title : link.playlist.title;
}
