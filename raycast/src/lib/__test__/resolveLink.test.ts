import { describe, expect, it } from "vitest";
import type { TrackInfo } from "@/bindings";
import { mapResolvedLink, resolvedTitle, type ResolvedLinkJson } from "../resolveLink";

const trackJson: TrackInfo = {
  id: 42,
  title: "Song",
  user: { id: 7, username: "Artist", avatar_url: null },
  artwork_url: "https://example.com/a.jpg",
  duration: 1000,
  permalink_url: "https://soundcloud.com/artist/song",
  waveform_url: null,
  downloadable: false,
  download_url: "https://dl",
  secret_token: "s-tok",
  preview_only: false,
} as TrackInfo;

const remoteTrack = {
  trackId: 42,
  trackUrl: "https://soundcloud.com/artist/song",
  title: "Song",
  artist: "Artist",
  artistId: 7,
  artworkUrl: "https://example.com/a.jpg",
  durationMs: 1000,
  waveformUrl: null,
};

describe("mapResolvedLink", () => {
  it("maps a track and keeps its secret token and download url", () => {
    expect(mapResolvedLink({ kind: "track", track: trackJson })).toEqual({
      kind: "track",
      track: remoteTrack,
      secretToken: "s-tok",
      downloadUrl: "https://dl",
    });
  });

  it("maps a playlist and forwards the raw tracks untouched", () => {
    const json: ResolvedLinkJson = {
      kind: "playlist",
      playlist: {
        id: 9,
        title: "My Set",
        user: { id: 3, username: "Owner", avatar_url: null },
        artwork_url: null,
        track_count: 2,
        tracks: [trackJson],
      },
    };
    const link = mapResolvedLink(json);
    expect(link).toEqual({
      kind: "playlist",
      playlist: { title: "My Set", owner: "Owner", artworkUrl: null, trackCount: 2, tracks: [trackJson] },
    });
    expect(link.kind === "playlist" && link.playlist.tracks).toBe(json.kind === "playlist" && json.playlist.tracks);
    expect(resolvedTitle(link)).toBe("My Set");
  });
});
