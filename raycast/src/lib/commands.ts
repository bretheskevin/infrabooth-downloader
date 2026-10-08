import { showHUD, showToast, Toast } from "@raycast/api";
import { getPlaylistTracks, sendCommand } from "./api";
import { handleError } from "./feedback";
import type { LibraryPlaylist } from "./mapping";
import type { RemoteCommand, RemoteTrack } from "@/lib/remote-protocol";

const SEND_FAILED = "Could not reach InfraBooth Downloader";

export async function sendWithToast(command: RemoteCommand, title: string): Promise<void> {
  try {
    await sendCommand(command);
    await showToast({ style: Toast.Style.Success, title });
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

export async function sendControl(command: RemoteCommand): Promise<void> {
  try {
    await sendCommand(command);
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

export async function playNow(tracks: RemoteTrack[], startIndex: number): Promise<void> {
  try {
    await sendCommand({ type: "playTracks", tracks, startIndex });
    await showHUD(`Playing ${tracks[startIndex]?.title ?? ""}`);
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

async function loadPlaylistTracks(playlist: LibraryPlaylist): Promise<{ toast: Toast; tracks: RemoteTrack[] } | null> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Loading ${playlist.title}…` });
  const tracks = await getPlaylistTracks(playlist.id, playlist.secretToken);
  if (tracks.length === 0) {
    toast.style = Toast.Style.Failure;
    toast.title = `${playlist.title} has no playable tracks`;
    return null;
  }
  return { toast, tracks };
}

export async function queuePlaylist(playlist: LibraryPlaylist): Promise<void> {
  try {
    const loaded = await loadPlaylistTracks(playlist);
    if (!loaded) return;
    const { toast, tracks } = loaded;
    await sendCommand({ type: "queueTracks", tracks });
    toast.style = Toast.Style.Success;
    toast.title = `Added ${tracks.length} tracks to queue`;
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}

export async function playPlaylist(playlist: LibraryPlaylist): Promise<void> {
  try {
    const loaded = await loadPlaylistTracks(playlist);
    if (!loaded) return;
    const { toast, tracks } = loaded;
    await toast.hide();
    await playNow(tracks, 0);
  } catch (error) {
    await handleError(error, SEND_FAILED);
  }
}
