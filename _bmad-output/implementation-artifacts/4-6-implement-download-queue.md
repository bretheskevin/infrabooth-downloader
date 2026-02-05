# Story 4.6: Implement Download Queue Processing

Status: ready-for-dev

## Story

As a **user**,
I want **all tracks in my playlist to download automatically**,
so that **I can start the download and walk away**.

## Acceptance Criteria

1. **Given** a playlist with multiple tracks
   **When** the user clicks "Download"
   **Then** all tracks are added to the download queue
   **And** processing begins with the first track
   **And** tracks are processed sequentially (one at a time)

2. **Given** a track completes successfully
   **When** moving to the next track
   **Then** the next track begins downloading immediately
   **And** the queue index advances
   **And** progress is tracked per-track and overall

3. **Given** a track fails (FR19)
   **When** processing the queue
   **Then** the failure is recorded for that track
   **And** the queue continues to the next track
   **And** successfully downloaded files are not affected (NFR9)

4. **Given** the queue is processing
   **When** a rate limit is encountered (API-5)
   **Then** the queue pauses with backoff
   **And** processing resumes when the limit clears
   **And** the current track retries (not skipped)

5. **Given** all tracks are processed
   **When** the queue completes
   **Then** a completion event is emitted
   **And** the queue state shows final status for all tracks

## Tasks / Subtasks

- [ ] Task 1: Create queue manager in Rust (AC: #1, #2, #3, #5)
  - [ ] 1.1 Create `src-tauri/src/services/queue.rs`:
    ```rust
    use crate::services::pipeline::{download_and_convert, PipelineConfig};
    use crate::models::error::PipelineError;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    #[derive(Clone)]
    pub struct QueueItem {
        pub track_url: String,
        pub track_id: String,
        pub title: String,
        pub artist: String,
        pub artwork_url: Option<String>,
        pub track_number: Option<u32>,
    }

    pub struct DownloadQueue {
        items: Vec<QueueItem>,
        current_index: usize,
        is_processing: bool,
        album_name: Option<String>,
        total_tracks: u32,
    }

    impl DownloadQueue {
        pub fn new(items: Vec<QueueItem>, album_name: Option<String>) -> Self {
            let total = items.len() as u32;
            Self {
                items,
                current_index: 0,
                is_processing: false,
                album_name,
                total_tracks: total,
            }
        }

        pub async fn process(
            &mut self,
            app: AppHandle,
            output_dir: PathBuf,
        ) -> QueueResult {
            self.is_processing = true;
            let mut completed = 0;
            let mut failed = 0;
            let mut failed_tracks: Vec<(String, String)> = vec![];

            while self.current_index < self.items.len() {
                let item = &self.items[self.current_index];

                // Emit queue progress
                let _ = app.emit("queue-progress", serde_json::json!({
                    "current": self.current_index + 1,
                    "total": self.total_tracks,
                    "trackId": item.track_id,
                }));

                let config = PipelineConfig {
                    track_url: item.track_url.clone(),
                    track_id: item.track_id.clone(),
                    output_dir: output_dir.clone(),
                    filename: sanitize_filename(&item.artist, &item.title),
                    metadata: TrackMetadata {
                        title: item.title.clone(),
                        artist: item.artist.clone(),
                        album: self.album_name.clone(),
                        track_number: item.track_number,
                        total_tracks: Some(self.total_tracks),
                        artwork_url: item.artwork_url.clone(),
                    },
                };

                match download_and_convert(config, app.clone()).await {
                    Ok(_) => {
                        completed += 1;
                    }
                    Err(PipelineError::Download(YtDlpError::RateLimited)) => {
                        // Rate limited - pause and retry
                        let backoff = calculate_backoff(failed);
                        let _ = app.emit("download-progress", serde_json::json!({
                            "trackId": item.track_id,
                            "status": "rate_limited",
                        }));

                        tokio::time::sleep(std::time::Duration::from_secs(backoff)).await;
                        continue; // Retry same track
                    }
                    Err(e) => {
                        failed += 1;
                        failed_tracks.push((item.track_id.clone(), e.to_string()));
                        // Continue to next track
                    }
                }

                self.current_index += 1;
            }

            self.is_processing = false;

            // Emit completion
            let _ = app.emit("queue-complete", serde_json::json!({
                "completed": completed,
                "failed": failed,
                "total": self.total_tracks,
                "failedTracks": failed_tracks,
            }));

            QueueResult { completed, failed }
        }
    }

    fn calculate_backoff(retry_count: u32) -> u64 {
        // Fibonacci backoff: 1, 1, 2, 3, 5, 8, 13, 21...
        let fib = |n: u32| -> u64 {
            let mut a = 1u64;
            let mut b = 1u64;
            for _ in 0..n {
                let tmp = a + b;
                a = b;
                b = tmp;
            }
            a
        };
        fib(retry_count.min(10)) // Cap at ~89 seconds
    }

    pub struct QueueResult {
        pub completed: u32,
        pub failed: u32,
    }
    ```

- [ ] Task 2: Create Tauri command for queue processing (AC: #1)
  - [ ] 2.1 Add to `src-tauri/src/commands/download.rs`:
    ```rust
    use crate::services::queue::{DownloadQueue, QueueItem};

    #[derive(Deserialize)]
    pub struct StartQueueRequest {
        pub tracks: Vec<QueueItemRequest>,
        pub album_name: Option<String>,
    }

    #[derive(Deserialize)]
    pub struct QueueItemRequest {
        pub track_url: String,
        pub track_id: String,
        pub title: String,
        pub artist: String,
        pub artwork_url: Option<String>,
    }

    #[tauri::command]
    pub async fn start_download_queue(
        request: StartQueueRequest,
        app: AppHandle,
    ) -> Result<(), String> {
        let output_dir = get_download_path(&app)?;

        let items: Vec<QueueItem> = request.tracks
            .into_iter()
            .enumerate()
            .map(|(i, t)| QueueItem {
                track_url: t.track_url,
                track_id: t.track_id,
                title: t.title,
                artist: t.artist,
                artwork_url: t.artwork_url,
                track_number: Some((i + 1) as u32),
            })
            .collect();

        let mut queue = DownloadQueue::new(items, request.album_name);

        // Run queue processing in background
        tokio::spawn(async move {
            queue.process(app, output_dir).await;
        });

        Ok(())
    }
    ```

- [ ] Task 3: Create TypeScript queue interface (AC: #1, #5)
  - [ ] 3.1 Update `src/lib/download.ts`:
    ```typescript
    export interface QueueItem {
      trackUrl: string;
      trackId: string;
      title: string;
      artist: string;
      artworkUrl?: string;
    }

    export interface StartQueueRequest {
      tracks: QueueItem[];
      albumName?: string;
    }

    export async function startDownloadQueue(
      request: StartQueueRequest
    ): Promise<void> {
      await invoke('start_download_queue', { request });
    }
    ```

- [ ] Task 4: Create queue event types (AC: #2, #5)
  - [ ] 4.1 Update `src/types/events.ts`:
    ```typescript
    export interface QueueProgressEvent {
      current: number;
      total: number;
      trackId: string;
    }

    export interface QueueCompleteEvent {
      completed: number;
      failed: number;
      total: number;
      failedTracks: Array<[string, string]>; // [trackId, errorMessage]
    }
    ```

- [ ] Task 5: Create queue progress hook (AC: #2, #5)
  - [ ] 5.1 Update `src/hooks/useDownloadProgress.ts`:
    ```typescript
    import { useEffect } from 'react';
    import { listen } from '@tauri-apps/api/event';
    import { useQueueStore } from '@/stores/queueStore';
    import type {
      DownloadProgressEvent,
      QueueProgressEvent,
      QueueCompleteEvent
    } from '@/types/events';

    export function useDownloadProgress() {
      const { updateTrackStatus, setQueueProgress, setQueueComplete } = useQueueStore();

      useEffect(() => {
        const unlistenProgress = listen<DownloadProgressEvent>(
          'download-progress',
          (event) => {
            updateTrackStatus(
              event.payload.trackId,
              event.payload.status,
              event.payload.error
            );
          }
        );

        const unlistenQueueProgress = listen<QueueProgressEvent>(
          'queue-progress',
          (event) => {
            setQueueProgress(event.payload.current, event.payload.total);
          }
        );

        const unlistenComplete = listen<QueueCompleteEvent>(
          'queue-complete',
          (event) => {
            setQueueComplete(event.payload);
          }
        );

        return () => {
          unlistenProgress.then(fn => fn());
          unlistenQueueProgress.then(fn => fn());
          unlistenComplete.then(fn => fn());
        };
      }, [updateTrackStatus, setQueueProgress, setQueueComplete]);
    }
    ```

- [ ] Task 6: Update queue store with progress tracking (AC: #2, #5)
  - [ ] 6.1 Update `src/stores/queueStore.ts`:
    ```typescript
    interface QueueState {
      tracks: Track[];
      currentIndex: number;
      totalTracks: number;
      isProcessing: boolean;
      isComplete: boolean;
      completedCount: number;
      failedCount: number;
      // Actions
      setTracks: (tracks: Track[]) => void;
      updateTrackStatus: (id: string, status: Track['status'], error?: Track['error']) => void;
      setQueueProgress: (current: number, total: number) => void;
      setQueueComplete: (result: QueueCompleteEvent) => void;
      clearQueue: () => void;
    }

    export const useQueueStore = create<QueueState>((set) => ({
      tracks: [],
      currentIndex: 0,
      totalTracks: 0,
      isProcessing: false,
      isComplete: false,
      completedCount: 0,
      failedCount: 0,

      setTracks: (tracks) => set({
        tracks,
        totalTracks: tracks.length,
        currentIndex: 0,
        isProcessing: false,
        isComplete: false,
      }),

      updateTrackStatus: (id, status, error) => set((state) => ({
        tracks: state.tracks.map(t =>
          t.id === id ? { ...t, status, error } : t
        ),
      })),

      setQueueProgress: (current, total) => set({
        currentIndex: current,
        totalTracks: total,
        isProcessing: true,
      }),

      setQueueComplete: (result) => set({
        isProcessing: false,
        isComplete: true,
        completedCount: result.completed,
        failedCount: result.failed,
      }),

      clearQueue: () => set({
        tracks: [],
        currentIndex: 0,
        totalTracks: 0,
        isProcessing: false,
        isComplete: false,
        completedCount: 0,
        failedCount: 0,
      }),
    }));
    ```

- [ ] Task 7: Wire up download button to queue (AC: #1)
  - [ ] 7.1 Update `DownloadSection.tsx`:
    ```typescript
    import { startDownloadQueue } from '@/lib/download';

    const handleDownload = async () => {
      const tracks = useQueueStore.getState().tracks;
      const albumName = playlistInfo?.title;

      await startDownloadQueue({
        tracks: tracks.map(t => ({
          trackUrl: `https://soundcloud.com/.../${t.id}`, // Construct URL
          trackId: t.id,
          title: t.title,
          artist: t.artist,
          artworkUrl: t.artworkUrl ?? undefined,
        })),
        albumName,
      });
    };
    ```

## Dev Notes

### Queue Processing Flow

```
User clicks Download
    ↓
start_download_queue command
    ↓
For each track:
    ↓
  download-progress event (downloading)
    ↓
  download-progress event (converting)
    ↓
  download-progress event (complete/failed)
    ↓
  queue-progress event (X of Y)
    ↓
queue-complete event
```

### Rate Limit Backoff

SoundCloud rate limits (API-5):
- 50 tokens per 12 hours per app
- 30 tokens per hour per IP

Fibonacci backoff: 1s, 1s, 2s, 3s, 5s, 8s, 13s, 21s, 34s, 55s, 89s
[Source: _bmad-output/planning-artifacts/epics.md#API-5]

### Sequential Processing

Downloads are sequential (one at a time) to:
- Respect rate limits
- Provide clear progress feedback
- Avoid overwhelming the system

Parallel downloads could be added later as optimization.

### Continue on Failure

Per FR19, individual failures don't stop the queue:
```rust
Err(e) => {
    failed += 1;
    failed_tracks.push((item.track_id.clone(), e.to_string()));
    // Continue to next track
}
```

Successfully downloaded files are unaffected (NFR9).

### Event Names

| Event | Direction | Purpose |
|-------|-----------|---------|
| `download-progress` | Rust → React | Per-track status |
| `queue-progress` | Rust → React | Overall X of Y |
| `queue-complete` | Rust → React | Final results |

### File Structure After This Story

```
src-tauri/
├── src/
│   ├── commands/
│   │   └── download.rs       # + start_download_queue
│   └── services/
│       └── queue.rs          # New - queue processing

src/
├── stores/
│   └── queueStore.ts         # Updated with progress
├── hooks/
│   └── useDownloadProgress.ts # Updated with queue events
├── lib/
│   └── download.ts           # + startDownloadQueue
├── types/
│   └── events.ts             # + QueueProgressEvent, QueueCompleteEvent
```

### What This Story Does NOT Include

- Progress UI (Epic 5)
- Completion panel (Epic 6)
- Error panel (Epic 7)

This story implements queue processing; UI is in following epics.

### Anti-Patterns to Avoid

- Do NOT process tracks in parallel — sequential for rate limits
- Do NOT stop on single failure — continue processing
- Do NOT skip rate limit handling — backoff is essential
- Do NOT forget to emit completion event

### Testing the Result

After completing all tasks:
1. Queue starts with all tracks
2. Tracks process sequentially
3. Progress events emitted for each track
4. Rate limit triggers backoff and retry
5. Failed tracks recorded but queue continues
6. Completion event includes final stats
7. Store reflects accurate progress

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.6]
- [Source: _bmad-output/planning-artifacts/epics.md#FR19]
- [Source: _bmad-output/planning-artifacts/epics.md#NFR9]
- [Source: _bmad-output/planning-artifacts/epics.md#API-5]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

