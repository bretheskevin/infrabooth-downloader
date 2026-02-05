# Story 3.5: Handle Single Track URLs

Status: ready-for-dev

## Story

As a **user**,
I want **to download individual tracks, not just playlists**,
so that **I can grab specific songs I want**.

## Acceptance Criteria

1. **Given** a valid single track URL is detected (FR6)
   **When** validation succeeds
   **Then** a request is made to fetch track metadata

2. **Given** track metadata is fetched
   **When** the response is received
   **Then** a preview card appears showing:
   - Track artwork (64×64)
   - Track title
   - Artist name
   - Duration
   - "1 track" indicator

3. **Given** a single track preview is displayed
   **When** viewing the card
   **Then** the same "Download" button appears
   **And** the flow is identical to playlist downloads
   **And** quality indicator shows "256kbps AAC → MP3"

4. **Given** a track is unavailable or geo-blocked
   **When** fetching metadata
   **Then** an appropriate error is shown immediately
   **And** the user understands why before attempting download

## Tasks / Subtasks

- [ ] Task 1: Create track fetch service in Rust (AC: #1)
  - [ ] 1.1 Add to `src-tauri/src/services/playlist.rs`:
    ```rust
    pub async fn fetch_track_info(url: &str) -> Result<TrackInfo, PlaylistError> {
        let access_token = get_valid_access_token().await?;

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

        if response.status() == 404 {
            return Err(PlaylistError::TrackNotFound);
        }

        if response.status() == 403 {
            return Err(PlaylistError::GeoBlocked);
        }

        if !response.status().is_success() {
            return Err(PlaylistError::FetchFailed);
        }

        let track: TrackInfo = response.json().await?;
        Ok(track)
    }
    ```

- [ ] Task 2: Create Tauri command for track info (AC: #1)
  - [ ] 2.1 Add to `src-tauri/src/commands/playlist.rs`:
    ```rust
    #[command]
    pub async fn get_track_info(url: String) -> Result<TrackInfo, String> {
        fetch_track_info(&url)
            .await
            .map_err(|e| e.to_string())
    }
    ```
  - [ ] 2.2 Register command in `lib.rs`

- [ ] Task 3: Create TypeScript fetch function (AC: #1)
  - [ ] 3.1 Add to `src/lib/playlist.ts`:
    ```typescript
    export async function fetchTrackInfo(url: string): Promise<TrackInfo> {
      return invoke<TrackInfo>('get_track_info', { url });
    }
    ```

- [ ] Task 4: Create TrackPreview component (AC: #2, #3)
  - [ ] 4.1 Create `src/components/features/download/TrackPreview.tsx`:
    ```typescript
    import { useTranslation } from 'react-i18next';
    import { Card, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { Music, Download, Clock } from 'lucide-react';
    import type { TrackInfo } from '@/types/playlist';
    import { formatDuration } from '@/lib/utils';

    interface TrackPreviewProps {
      track: TrackInfo;
      onDownload: () => void;
      isDownloading?: boolean;
    }

    export function TrackPreview({
      track,
      onDownload,
      isDownloading
    }: TrackPreviewProps) {
      const { t } = useTranslation();

      return (
        <Card className="mt-4">
          <CardContent className="flex items-center gap-4 p-4">
            {/* Artwork */}
            <div className="flex-shrink-0">
              {track.artworkUrl ? (
                <img
                  src={track.artworkUrl}
                  alt={track.title}
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
              <h3 className="font-semibold truncate">{track.title}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {track.user.username}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(track.duration)}
                </div>
                <span className="text-sm">{t('download.singleTrack')}</span>
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

- [ ] Task 5: Add duration formatter utility (AC: #2)
  - [ ] 5.1 Add to `src/lib/utils.ts`:
    ```typescript
    /**
     * Format duration in milliseconds to mm:ss
     */
    export function formatDuration(ms: number): string {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    ```

- [ ] Task 6: Update DownloadSection to handle tracks (AC: #1, #2, #3)
  - [ ] 6.1 Update `DownloadSection.tsx`:
    ```typescript
    import { TrackPreview } from './TrackPreview';
    import { fetchTrackInfo } from '@/lib/playlist';

    export function DownloadSection() {
      // ... existing state
      const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);

      // Fetch based on URL type
      useEffect(() => {
        if (!validationResult?.valid) {
          setPlaylistInfo(null);
          setTrackInfo(null);
          return;
        }

        setIsFetchingPlaylist(true);

        if (validationResult.urlType === 'playlist') {
          fetchPlaylistInfo(url)
            .then((info) => {
              setPlaylistInfo(info);
              setTrackInfo(null);
              setTracks(info.tracks.map(/* ... */));
            })
            .catch(handleFetchError)
            .finally(() => setIsFetchingPlaylist(false));
        } else if (validationResult.urlType === 'track') {
          fetchTrackInfo(url)
            .then((info) => {
              setTrackInfo(info);
              setPlaylistInfo(null);
              // Single track in queue
              setTracks([{
                id: info.id,
                title: info.title,
                artist: info.user.username,
                artworkUrl: info.artworkUrl,
                status: 'pending',
              }]);
            })
            .catch(handleFetchError)
            .finally(() => setIsFetchingPlaylist(false));
        }
      }, [validationResult, url, setTracks]);

      return (
        <section className="space-y-4">
          {/* ... existing content */}

          {/* Preview - Playlist or Track */}
          {playlistInfo && !isFetchingPlaylist && (
            <PlaylistPreview
              playlist={playlistInfo}
              onDownload={handleDownload}
            />
          )}
          {trackInfo && !isFetchingPlaylist && (
            <TrackPreview
              track={trackInfo}
              onDownload={handleDownload}
            />
          )}
        </section>
      );
    }
    ```

- [ ] Task 7: Handle track unavailability errors (AC: #4)
  - [ ] 7.1 Add error types to `src-tauri/src/models/error.rs`:
    ```rust
    #[derive(Debug, thiserror::Error)]
    pub enum PlaylistError {
        #[error("Track not found")]
        TrackNotFound,
        #[error("Track unavailable in your region")]
        GeoBlocked,
        #[error("Failed to fetch metadata")]
        FetchFailed,
        // ... other errors
    }
    ```
  - [ ] 7.2 Handle errors in frontend:
    ```typescript
    const handleFetchError = (error: Error) => {
      const message = error.message;
      if (message.includes('not found')) {
        setValidationResult({
          valid: false,
          error: {
            code: 'INVALID_URL',
            message: t('errors.trackNotFound'),
            hint: t('errors.trackNotFoundHint'),
          },
        });
      } else if (message.includes('region')) {
        setValidationResult({
          valid: false,
          error: {
            code: 'GEO_BLOCKED',
            message: t('errors.geoBlocked'),
          },
        });
      }
    };
    ```

- [ ] Task 8: Add translation keys (AC: #2, #4)
  - [ ] 8.1 Add to `en.json`:
    ```json
    "download": {
      "singleTrack": "1 track"
    },
    "errors": {
      "trackNotFound": "Track not found",
      "trackNotFoundHint": "This track may have been removed or made private"
    }
    ```
  - [ ] 8.2 Add to `fr.json`:
    ```json
    "download": {
      "singleTrack": "1 piste"
    },
    "errors": {
      "trackNotFound": "Piste non trouvée",
      "trackNotFoundHint": "Cette piste a peut-être été supprimée ou rendue privée"
    }
    ```

## Dev Notes

### Track Preview Layout

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────┐                                                │
│ │      │  Track Title                      [Download]   │
│ │ Art  │  Artist Name                                   │
│ │      │  ⏱ 3:45 • 1 track • 256kbps AAC → MP3         │
│ └──────┘                                                │
└─────────────────────────────────────────────────────────┘
```

Similar to playlist preview but with duration instead of track count.

### Duration Format

SoundCloud returns duration in milliseconds:
- `185000` ms → `3:05`
- `3661000` ms → `61:01`

Use `formatDuration()` helper for consistent formatting.

### Single Track in Queue

For single tracks, the queue contains one item:
```typescript
setTracks([{
  id: track.id,
  title: track.title,
  artist: track.user.username,
  artworkUrl: track.artworkUrl,
  status: 'pending',
}]);
```

The download flow is identical — queue processing handles 1 or N tracks.

### Error Detection

SoundCloud returns different HTTP status codes:
- `404` → Track not found / deleted
- `403` → Geo-blocked
- `401` → Auth issue (should trigger re-auth)

Map these to user-friendly messages with hints.
[Source: _bmad-output/planning-artifacts/epics.md#FR16, FR17]

### File Structure After This Story

```
src-tauri/
├── src/
│   ├── commands/
│   │   └── playlist.rs       # + get_track_info
│   └── services/
│       └── playlist.rs       # + fetch_track_info

src/
├── components/
│   ├── features/
│   │   └── download/
│   │       ├── DownloadSection.tsx  # Updated
│   │       ├── PlaylistPreview.tsx
│   │       └── TrackPreview.tsx     # New
├── lib/
│   ├── playlist.ts                  # + fetchTrackInfo
│   └── utils.ts                     # + formatDuration
```

### What This Story Does NOT Include

- Download functionality (Epic 4)
- Detailed error panel (Epic 7)
- Retry mechanism for failed fetches

### Unified Flow

After this story, the flow is unified:
1. User pastes URL
2. URL validated (playlist or track)
3. Metadata fetched
4. Preview shown (PlaylistPreview or TrackPreview)
5. Tracks added to queue
6. User clicks Download
7. (Epic 4 handles download)

### Anti-Patterns to Avoid

- Do NOT duplicate download button logic — same handler for both
- Do NOT show technical error messages — translate to user-friendly
- Do NOT skip geo-block detection — check before download

### Testing the Result

After completing all tasks:
1. Valid track URL shows track preview
2. Preview shows title, artist, duration
3. "1 track" indicator visible
4. Download button works same as playlist
5. Unavailable track shows clear error
6. Geo-blocked track shows region message
7. Duration formatted as mm:ss

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5]
- [Source: _bmad-output/planning-artifacts/epics.md#FR6]
- [Source: _bmad-output/planning-artifacts/epics.md#FR16, FR17]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

