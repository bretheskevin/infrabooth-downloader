# Story 3.4: Fetch and Display Playlist Preview

Status: review

## Story

As a **user**,
I want **to see a preview of the playlist I'm about to download**,
so that **I can confirm it's the right content before starting**.

## Acceptance Criteria

1. **Given** a valid playlist URL is detected
   **When** validation succeeds
   **Then** a request is made to fetch playlist metadata
   **And** the request uses the authenticated user's token

2. **Given** playlist metadata is fetched
   **When** the response is received
   **Then** a preview card appears below the URL input showing:
   - Playlist thumbnail (64×64 per UX spec)
   - Playlist title
   - Track count (e.g., "47 tracks")
   - Creator name

3. **Given** the preview is displayed
   **When** viewing the card
   **Then** a "Download" button is prominently shown
   **And** the button uses primary style (solid indigo)
   **And** the preview indicates quality: "256kbps AAC → MP3"

4. **Given** the playlist has tracks (FR7)
   **When** the metadata is processed
   **Then** the track list is extracted and stored in the queue store
   **And** the track count accurately reflects extractable tracks

5. **Given** the preview is displayed
   **When** the user pastes a different URL
   **Then** the preview clears and validation restarts
   **And** the old preview is replaced with new results

## Tasks / Subtasks

- [x] Task 1: Create playlist fetch service in Rust (AC: #1, #4)
  - [x] 1.1 Add to `src-tauri/src/services/playlist.rs`:
    ```rust
    use crate::services::oauth::get_valid_access_token;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    pub struct PlaylistInfo {
        pub id: String,
        pub title: String,
        pub user: UserInfo,
        pub artwork_url: Option<String>,
        pub track_count: u32,
        pub tracks: Vec<TrackInfo>,
    }

    #[derive(Debug, Serialize, Deserialize)]
    pub struct UserInfo {
        pub username: String,
    }

    #[derive(Debug, Serialize, Deserialize)]
    pub struct TrackInfo {
        pub id: String,
        pub title: String,
        pub user: UserInfo,
        pub artwork_url: Option<String>,
        pub duration: u64,
    }

    pub async fn fetch_playlist_info(url: &str) -> Result<PlaylistInfo, PlaylistError> {
        let access_token = get_valid_access_token().await?;

        // Use resolve endpoint to get playlist data from URL
        let client = reqwest::Client::new();
        let resolve_url = format!(
            "https://api.soundcloud.com/resolve?url={}&client_id={}",
            urlencoding::encode(url),
            crate::services::oauth::CLIENT_ID
        );

        let response = client
            .get(&resolve_url)
            .header("Authorization", format!("OAuth {}", access_token))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(PlaylistError::FetchFailed);
        }

        let playlist: PlaylistInfo = response.json().await?;
        Ok(playlist)
    }
    ```
  - [x] 1.2 Add `urlencoding` crate: `urlencoding = "2"`

- [x] Task 2: Create Tauri command for playlist info (AC: #1)
  - [x] 2.1 Add to `src-tauri/src/commands/playlist.rs`:
    ```rust
    #[command]
    pub async fn get_playlist_info(url: String) -> Result<PlaylistInfo, String> {
        fetch_playlist_info(&url)
            .await
            .map_err(|e| e.to_string())
    }
    ```
  - [x] 2.2 Register command in `lib.rs`

- [x] Task 3: Create TypeScript types and fetch function (AC: #1)
  - [x] 3.1 Add to `src/types/playlist.ts`:
    ```typescript
    export interface PlaylistInfo {
      id: string;
      title: string;
      user: {
        username: string;
      };
      artworkUrl: string | null;
      trackCount: number;
      tracks: TrackInfo[];
    }

    export interface TrackInfo {
      id: string;
      title: string;
      user: {
        username: string;
      };
      artworkUrl: string | null;
      duration: number;
    }
    ```
  - [x] 3.2 Create `src/lib/playlist.ts`:
    ```typescript
    import { invoke } from '@tauri-apps/api/core';
    import type { PlaylistInfo } from '@/types/playlist';

    export async function fetchPlaylistInfo(url: string): Promise<PlaylistInfo> {
      return invoke<PlaylistInfo>('get_playlist_info', { url });
    }
    ```

- [x] Task 4: Create PlaylistPreview component (AC: #2, #3)
  - [x] 4.1 Create `src/components/features/download/PlaylistPreview.tsx`:
    ```typescript
    import { useTranslation } from 'react-i18next';
    import { Card, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { Music, Download } from 'lucide-react';
    import type { PlaylistInfo } from '@/types/playlist';

    interface PlaylistPreviewProps {
      playlist: PlaylistInfo;
      onDownload: () => void;
      isDownloading?: boolean;
    }

    export function PlaylistPreview({
      playlist,
      onDownload,
      isDownloading
    }: PlaylistPreviewProps) {
      const { t } = useTranslation();

      return (
        <Card className="mt-4">
          <CardContent className="flex items-center gap-4 p-4">
            {/* Artwork */}
            <div className="flex-shrink-0">
              {playlist.artworkUrl ? (
                <img
                  src={playlist.artworkUrl}
                  alt={playlist.title}
                  className="w-16 h-16 rounded-md object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{playlist.title}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {playlist.user.username}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm">
                  {t('download.trackCount', { count: playlist.trackCount })}
                </span>
                <Badge variant="secondary" className="text-xs">
                  256kbps AAC → MP3
                </Badge>
              </div>
            </div>

            {/* Download Button */}
            <Button
              onClick={onDownload}
              disabled={isDownloading}
              className="flex-shrink-0"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('download.button')}
            </Button>
          </CardContent>
        </Card>
      );
    }
    ```
  - [x] 4.2 Add Shadcn Card: `npx shadcn@latest add card`

- [x] Task 5: Integrate preview into DownloadSection (AC: #1, #2, #5)
  - [x] 5.1 Update `DownloadSection.tsx`:
    ```typescript
    import { PlaylistPreview } from './PlaylistPreview';
    import { fetchPlaylistInfo } from '@/lib/playlist';
    import { useQueueStore } from '@/stores/queueStore';

    export function DownloadSection() {
      // ... existing state
      const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
      const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);
      const setTracks = useQueueStore((state) => state.setTracks);

      // Fetch playlist when validation succeeds
      useEffect(() => {
        if (validationResult?.valid && validationResult.urlType === 'playlist') {
          setIsFetchingPlaylist(true);
          fetchPlaylistInfo(url)
            .then((info) => {
              setPlaylistInfo(info);
              // Store tracks in queue
              setTracks(info.tracks.map(t => ({
                id: t.id,
                title: t.title,
                artist: t.user.username,
                artworkUrl: t.artworkUrl,
                status: 'pending' as const,
              })));
            })
            .catch(console.error)
            .finally(() => setIsFetchingPlaylist(false));
        } else {
          setPlaylistInfo(null);
        }
      }, [validationResult, url, setTracks]);

      const handleDownload = () => {
        // Will be implemented in Epic 4
        console.log('Starting download...');
      };

      return (
        <section className="space-y-4">
          {/* URL Input */}
          {/* Validation Feedback */}

          {/* Playlist Preview */}
          {isFetchingPlaylist && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('download.fetchingPlaylist')}
            </div>
          )}
          {playlistInfo && !isFetchingPlaylist && (
            <PlaylistPreview
              playlist={playlistInfo}
              onDownload={handleDownload}
            />
          )}
        </section>
      );
    }
    ```

- [x] Task 6: Handle URL change clearing preview (AC: #5)
  - [x] 6.1 Clear playlist info when URL changes:
    ```typescript
    const handleUrlChange = useCallback((newUrl: string) => {
      setUrl(newUrl);
      setPlaylistInfo(null); // Clear preview immediately
      if (!newUrl) {
        setValidationResult(null);
      }
    }, []);
    ```

- [x] Task 7: Add translation keys (AC: #2, #3)
  - [x] 7.1 Add to `en.json`:
    ```json
    "download": {
      "trackCount": "{{count}} track",
      "trackCount_plural": "{{count}} tracks",
      "fetchingPlaylist": "Loading playlist...",
      "button": "Download"
    }
    ```
  - [x] 7.2 Add to `fr.json`:
    ```json
    "download": {
      "trackCount": "{{count}} piste",
      "trackCount_plural": "{{count}} pistes",
      "fetchingPlaylist": "Chargement de la playlist...",
      "button": "Télécharger"
    }
    ```

## Dev Notes

### SoundCloud Resolve API

The `/resolve` endpoint converts a URL to API data:
```
GET https://api.soundcloud.com/resolve?url={url}&client_id={client_id}
Authorization: OAuth {access_token}
```

Returns playlist/track object based on the URL type.

### Preview Card Layout

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────┐                                                │
│ │      │  Playlist Title                   [Download]   │
│ │ Art  │  Creator Name                                  │
│ │      │  47 tracks • 256kbps AAC → MP3                 │
│ └──────┘                                                │
└─────────────────────────────────────────────────────────┘
```

- Artwork: 64×64 pixels
- Truncate long titles with ellipsis
- Quality badge inline with track count

[Source: ux-design-specification.md#Component Strategy]

### Artwork URL Handling

SoundCloud artwork URLs need size suffix adjustment:
- Original: `https://i1.sndcdn.com/artworks-xxx-large.jpg`
- For 64×64: Replace `-large` with `-t67x67`

```typescript
const getArtworkUrl = (url: string | null, size: number = 64) => {
  if (!url) return null;
  return url.replace('-large', `-t${size}x${size}`);
};
```

### File Structure After This Story

```
src-tauri/
├── src/
│   ├── commands/
│   │   └── playlist.rs      # + get_playlist_info
│   └── services/
│       └── playlist.rs      # fetch_playlist_info

src/
├── components/
│   ├── features/
│   │   └── download/
│   │       ├── DownloadSection.tsx  # Updated
│   │       └── PlaylistPreview.tsx  # New
│   └── ui/
│       └── card.tsx                 # Added via shadcn
├── types/
│   └── playlist.ts                  # PlaylistInfo types
├── lib/
│   └── playlist.ts                  # fetchPlaylistInfo
```

### Queue Store Integration

When playlist is fetched, tracks are stored in `queueStore`:
```typescript
setTracks(info.tracks.map(t => ({
  id: t.id,
  title: t.title,
  artist: t.user.username,
  artworkUrl: t.artworkUrl,
  status: 'pending',
})));
```

This prepares for Epic 4 (Download) and Epic 5 (Progress).

### What This Story Does NOT Include

- Single track preview (Story 3.5)
- Download functionality (Epic 4)
- Progress display (Epic 5)
- Error handling for geo-blocked playlists (Epic 7)

### Rate Limiting Consideration

SoundCloud has rate limits (API-5). The preview fetch counts against limits:
- 50 tokens per 12 hours per app
- 30 tokens per hour per IP

One preview fetch = one token. Consider caching if user re-pastes same URL.

### Anti-Patterns to Avoid

- Do NOT fetch playlist without valid auth token
- Do NOT block UI during fetch — show loading state
- Do NOT keep old preview when URL changes
- Do NOT make API calls for validation — only for preview

### Testing the Result

After completing all tasks:
1. Valid playlist URL shows loading state
2. Preview card appears with artwork, title, count
3. "Download" button is visible and clickable
4. Quality badge shows "256kbps AAC → MP3"
5. Pasting new URL clears old preview
6. Tracks stored in queue store
7. Missing artwork shows placeholder icon

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]
- [Source: ux-design-specification.md#Component Strategy]
- [Source: _bmad-output/planning-artifacts/epics.md#FR7]
- [Source: _bmad-output/planning-artifacts/epics.md#API-5]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None

### Completion Notes List

- ✅ Task 1: Created `src-tauri/src/services/playlist.rs` with PlaylistInfo, TrackInfo, UserInfo structs and fetch_playlist_info async function. Added PlaylistError enum for error handling. 12 unit tests pass.
- ✅ Task 2: Added `get_playlist_info` Tauri command to `src-tauri/src/commands/playlist.rs`. Registered in `lib.rs`.
- ✅ Task 3: Created `src/types/playlist.ts` with TypeScript interfaces. Created `src/lib/playlist.ts` with fetchPlaylistInfo function. 5 unit tests pass.
- ✅ Task 4: Created `PlaylistPreview.tsx` component with artwork display, title, creator, track count, quality badge, and download button. Added shadcn Card component. 15 unit tests pass.
- ✅ Task 5: Integrated playlist preview into DownloadSection. Added loading state, playlist fetch on valid URL, queue store integration. 18 tests pass.
- ✅ Task 6: URL change clearing implemented in handleUrlChange callback.
- ✅ Task 7: Added i18n keys `download.fetchingPlaylist`, `download.trackCount_one`, `download.trackCount_other` to both en.json and fr.json.

**Test Summary:**
- Frontend: 243 tests pass
- Backend: 80 tests pass
- Full build: ✅ Success (frontend + backend)

### File List

**New Files:**
- src-tauri/src/services/playlist.rs
- src/types/playlist.ts
- src/lib/playlist.ts
- src/lib/playlist.test.ts
- src/components/features/download/PlaylistPreview.tsx
- src/components/features/download/PlaylistPreview.test.tsx
- src/components/ui/card.tsx (via shadcn)

**Modified Files:**
- src-tauri/src/services/mod.rs (added playlist module)
- src-tauri/src/commands/mod.rs (exported get_playlist_info)
- src-tauri/src/commands/playlist.rs (added get_playlist_info command)
- src-tauri/src/lib.rs (registered get_playlist_info command)
- src-tauri/Cargo.toml (added urlencoding dependency)
- src/components/features/download/DownloadSection.tsx (integrated preview)
- src/components/features/download/DownloadSection.test.tsx (added preview tests)
- src/locales/en.json (added translation keys)
- src/locales/fr.json (added translation keys)

## Change Log

- 2026-02-09: Story 3.4 implemented - Playlist preview with fetch, display, and queue integration

