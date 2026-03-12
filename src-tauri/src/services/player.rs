use std::sync::mpsc;
use std::sync::Arc;
use std::time::{Duration, Instant};

use rodio::{OutputStream, Sink};

use super::audio_decoder::AudioDecoder;
use crate::services::stream::StreamCodec;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

use crate::models::player::*;
use crate::services::storage::AuthState;
use crate::services::stream;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Channel sender for fire-and-forget commands — no mutex needed.
pub type PlayerCommandSender = mpsc::Sender<PlayerCommand>;

/// Shared player state accessible from Tauri commands (read-only queries).
pub struct PlayerState {
    pub queue: Vec<PlaybackItem>,
    pub cursor: usize,
    pub state: PlaybackState,
    pub volume: f32,
    pub position_ms: u64,
    pub duration_ms: u64,
}

pub type SharedPlayerState = Arc<Mutex<PlayerState>>;

impl PlayerState {
    pub fn reorder(&mut self, from: usize, to: usize) -> Result<(), PlayerError> {
        if from >= self.queue.len() || to >= self.queue.len() {
            return Err(PlayerError::InvalidOperation("Index out of bounds".into()));
        }
        let item = self.queue.remove(from);
        self.queue.insert(to, item);

        if from == self.cursor {
            self.cursor = to;
        } else if from < self.cursor && to >= self.cursor {
            self.cursor -= 1;
        } else if from > self.cursor && to <= self.cursor {
            self.cursor += 1;
        }
        Ok(())
    }

    pub fn remove(&mut self, index: usize) -> Result<(), PlayerError> {
        if index == self.cursor {
            return Err(PlayerError::InvalidOperation(
                "Cannot remove currently playing track".into(),
            ));
        }
        if index >= self.queue.len() {
            return Err(PlayerError::InvalidOperation("Index out of bounds".into()));
        }
        self.queue.remove(index);
        if index < self.cursor {
            self.cursor -= 1;
        }
        Ok(())
    }

    pub fn get_snapshot(&self) -> PlayerStateSnapshot {
        PlayerStateSnapshot {
            state: self.state,
            current_track: self.queue.get(self.cursor).cloned(),
            queue: self.queue.clone(),
            cursor: self.cursor,
            position_ms: self.position_ms,
            duration_ms: self.duration_ms,
            volume: self.volume,
        }
    }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

pub fn init_player(app_handle: AppHandle) -> (SharedPlayerState, PlayerCommandSender) {
    let (command_tx, command_rx) = mpsc::channel::<PlayerCommand>();

    let state = Arc::new(Mutex::new(PlayerState {
        queue: Vec::new(),
        cursor: 0,
        state: PlaybackState::Stopped,
        volume: 1.0,
        position_ms: 0,
        duration_ms: 0,
    }));

    let state_clone = Arc::clone(&state);
    let rt_handle = tauri::async_runtime::handle().inner().clone();

    std::thread::Builder::new()
        .name("audio-player".into())
        .spawn(move || {
            audio_thread_main(command_rx, state_clone, app_handle, rt_handle);
        })
        .expect("Failed to spawn audio thread");

    (state, command_tx)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Emit a typed event to the frontend.
fn emit_event<S: serde::Serialize + Clone>(app: &AppHandle, event: &str, payload: S) {
    let _ = app.emit(event, payload);
}

/// Update shared state fields (acquires lock).
fn update_state(
    rt: &tokio::runtime::Handle,
    shared: &SharedPlayerState,
    f: impl FnOnce(&mut PlayerState),
) {
    rt.block_on(async {
        let mut s = shared.lock().await;
        f(&mut s);
    });
}

/// Read shared state fields (acquires lock, returns value).
fn read_state<T>(
    rt: &tokio::runtime::Handle,
    shared: &SharedPlayerState,
    f: impl FnOnce(&PlayerState) -> T,
) -> T {
    rt.block_on(async {
        let s = shared.lock().await;
        f(&s)
    })
}

// ---------------------------------------------------------------------------
// Playback context — mutable bookkeeping passed through helpers
// ---------------------------------------------------------------------------

struct PlaybackContext<'a> {
    sink: &'a Sink,
    shared_state: &'a SharedPlayerState,
    app: &'a AppHandle,
    rt: &'a tokio::runtime::Handle,
    playback_start_time: &'a mut Option<Instant>,
    playback_offset_ms: &'a mut u64,
    /// Monotonically increasing generation counter.
    /// Incremented each time a new track starts loading. The background loader
    /// compares its captured generation with the current one; if they differ
    /// (because the user pressed next/stop while loading), the loader aborts.
    load_generation: &'a mut u64,
}

// ---------------------------------------------------------------------------
// Track loading (non-blocking)
// ---------------------------------------------------------------------------


fn spawn_track_loader(
    rt: &tokio::runtime::Handle,
    app: &AppHandle,
    track: &PlaybackItem,
    shared_state: &SharedPlayerState,
) -> tokio::sync::oneshot::Receiver<Result<(Vec<u8>, StreamCodec), String>> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let track_url = track.track_url.clone();
    let app_clone = app.clone();
    let shared = Arc::clone(shared_state);

    rt.spawn(async move {
        let result = load_track_async(&app_clone, &track_url, &shared).await;
        let _ = tx.send(result);
    });

    rx
}

/// Check whether the player is still in the Loading state.
/// If the user pressed Stop/Next while loading, state will have changed and we should abort.
async fn is_still_loading(shared: &SharedPlayerState) -> bool {
    let s = shared.lock().await;
    s.state == PlaybackState::Loading
}

async fn load_track_async(
    app: &AppHandle,
    track_url: &str,
    shared: &SharedPlayerState,
) -> Result<(Vec<u8>, StreamCodec), String> {
    let oauth_token = app
        .try_state::<AuthState>()
        .and_then(|state| state.get_token());

    let stream_info = stream::resolve_stream_url(track_url, oauth_token.as_deref())
        .await
        .map_err(|e| format!("Stream resolution failed: {}", e))?;

    // Check if still loading (user may have pressed stop/next during resolution)
    if !is_still_loading(shared).await {
        return Err("Load cancelled".to_string());
    }

    let codec = stream_info.codec.clone();
    let bytes = if stream_info.is_hls {
        load_hls_stream(&stream_info.url).await?
    } else {
        load_progressive_stream(&stream_info.url).await?
    };

    Ok((bytes, codec))
}

/// Fetch a progressive (direct HTTP) audio stream.
async fn load_progressive_stream(url: &str) -> Result<Vec<u8>, String> {
    let mut response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to fetch audio: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let content_length = response.content_length().unwrap_or(0) as usize;
    let mut audio_bytes = Vec::with_capacity(content_length);

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Failed to read audio chunk: {}", e))?
    {
        audio_bytes.extend_from_slice(&chunk);
    }

    Ok(audio_bytes)
}

/// Fetch an HLS stream: parse M3U8 playlist and concatenate audio segments.
async fn load_hls_stream(playlist_url: &str) -> Result<Vec<u8>, String> {
    let playlist_text = reqwest::get(playlist_url)
        .await
        .map_err(|e| format!("Failed to fetch HLS playlist: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read HLS playlist: {}", e))?;

    let segment_urls = parse_m3u8_segments(&playlist_text, playlist_url);
    if segment_urls.is_empty() {
        return Err("HLS playlist contains no audio segments".to_string());
    }

    log::info!(
        "[player] HLS: fetching {} segments from playlist",
        segment_urls.len()
    );

    let client = reqwest::Client::new();
    let mut audio_bytes = Vec::new();

    for segment_url in &segment_urls {
        let response = client
            .get(segment_url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch HLS segment: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "HLS segment HTTP {}",
                response.status()
            ));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read HLS segment: {}", e))?;
        audio_bytes.extend_from_slice(&bytes);
    }

    Ok(audio_bytes)
}

/// Parse an M3U8 playlist and return absolute segment URLs.
fn parse_m3u8_segments(playlist_text: &str, playlist_url: &str) -> Vec<String> {
    let base_url = playlist_url
        .rsplit_once('/')
        .map(|(base, _)| base)
        .unwrap_or(playlist_url);

    playlist_text
        .lines()
        .filter(|line| !line.starts_with('#') && !line.trim().is_empty())
        .map(|line| {
            let line = line.trim();
            if line.starts_with("http://") || line.starts_with("https://") {
                line.to_string()
            } else {
                format!("{}/{}", base_url, line)
            }
        })
        .collect()
}


// ---------------------------------------------------------------------------
// Playback helpers
// ---------------------------------------------------------------------------

fn play_loaded_audio(
    audio_bytes: Vec<u8>,
    codec: StreamCodec,
    track: &PlaybackItem,
    cursor: usize,
    ctx: &mut PlaybackContext,
) {
    let decoder_result = match codec {
        StreamCodec::Aac => AudioDecoder::new_m4a(audio_bytes),
        StreamCodec::Mp3 => AudioDecoder::new_mp3(audio_bytes),
        StreamCodec::Opus => AudioDecoder::new_opus(audio_bytes),
        StreamCodec::Unknown => AudioDecoder::new_auto(audio_bytes),
    };
    match decoder_result {
        Ok(source) => {
            ctx.sink.clear();
            ctx.sink.append(source);

            let vol = read_state(ctx.rt, ctx.shared_state, |s| s.volume);
            ctx.sink.set_volume(vol);
            ctx.sink.play();
            *ctx.playback_start_time = Some(Instant::now());
            *ctx.playback_offset_ms = 0;

            let queue_len = read_state(ctx.rt, ctx.shared_state, |s| s.queue.len());

            update_state(ctx.rt, ctx.shared_state, |s| {
                s.state = PlaybackState::Playing;
            });

            emit_event(
                ctx.app,
                "player:state-changed",
                PlayerStateChangedPayload {
                    state: PlaybackState::Playing,
                    track_id: Some(track.track_id),
                },
            );
            emit_event(
                ctx.app,
                "player:track-changed",
                PlayerTrackChangedPayload {
                    track_id: track.track_id,
                    cursor,
                    queue_length: queue_len,
                },
            );
        }
        Err(e) => {
            log::error!("[player] Failed to decode audio: {}", e);
            update_state(ctx.rt, ctx.shared_state, |s| {
                s.state = PlaybackState::Stopped;
            });
            emit_event(
                ctx.app,
                "player:error",
                PlayerErrorPayload {
                    track_id: Some(track.track_id),
                    message: format!("Failed to decode audio: {}", e),
                },
            );
        }
    }
}

fn begin_track_load(
    track: &PlaybackItem,
    cursor: usize,
    ctx: &mut PlaybackContext,
) -> (
    tokio::sync::oneshot::Receiver<Result<(Vec<u8>, StreamCodec), String>>,
    PlaybackItem,
) {
    *ctx.load_generation += 1;

    update_state(ctx.rt, ctx.shared_state, |s| {
        s.cursor = cursor;
        s.state = PlaybackState::Loading;
        s.position_ms = 0;
        s.duration_ms = track.duration_ms;
    });

    emit_event(
        ctx.app,
        "player:state-changed",
        PlayerStateChangedPayload {
            state: PlaybackState::Loading,
            track_id: Some(track.track_id),
        },
    );

    let rx = spawn_track_loader(
        ctx.rt,
        ctx.app,
        track,
        ctx.shared_state,
    );

    (rx, track.clone())
}

/// Stop playback and reset state.
fn stop_playback(ctx: &mut PlaybackContext) {
    ctx.sink.clear();
    *ctx.playback_start_time = None;
    *ctx.playback_offset_ms = 0;
    *ctx.load_generation += 1; // Cancel any in-flight loader

    update_state(ctx.rt, ctx.shared_state, |s| {
        s.state = PlaybackState::Stopped;
        s.position_ms = 0;
        s.queue.clear();
        s.cursor = 0;
    });

    emit_event(
        ctx.app,
        "player:state-changed",
        PlayerStateChangedPayload {
            state: PlaybackState::Stopped,
            track_id: None,
        },
    );
}

/// Advance to the next track in the queue. Stops if at end.
/// Returns an optional pending loader.
fn advance_next(
    ctx: &mut PlaybackContext,
) -> Option<(
    tokio::sync::oneshot::Receiver<Result<(Vec<u8>, StreamCodec), String>>,
    PlaybackItem,
    usize,
)> {
    let (next_cursor, next_track) = read_state(ctx.rt, ctx.shared_state, |s| {
        let next = s.cursor + 1;
        if next < s.queue.len() {
            (Some(next), s.queue.get(next).cloned())
        } else {
            (None, None)
        }
    });

    if let (Some(cursor), Some(track)) = (next_cursor, next_track) {
        let (rx, t) = begin_track_load(&track, cursor, ctx);
        Some((rx, t, cursor))
    } else {
        // End of queue
        ctx.sink.clear();
        *ctx.playback_start_time = None;
        *ctx.playback_offset_ms = 0;

        update_state(ctx.rt, ctx.shared_state, |s| {
            s.state = PlaybackState::Stopped;
            s.position_ms = 0;
        });

        emit_event(
            ctx.app,
            "player:state-changed",
            PlayerStateChangedPayload {
                state: PlaybackState::Stopped,
                track_id: None,
            },
        );
        None
    }
}

/// Go to the previous track. No-op if already at index 0.
fn advance_previous(
    ctx: &mut PlaybackContext,
) -> Option<(
    tokio::sync::oneshot::Receiver<Result<(Vec<u8>, StreamCodec), String>>,
    PlaybackItem,
    usize,
)> {
    let (prev_cursor, prev_track) = read_state(ctx.rt, ctx.shared_state, |s| {
        if s.cursor > 0 {
            let prev = s.cursor - 1;
            (Some(prev), s.queue.get(prev).cloned())
        } else {
            (None, None)
        }
    });

    if let (Some(cursor), Some(track)) = (prev_cursor, prev_track) {
        let (rx, t) = begin_track_load(&track, cursor, ctx);
        Some((rx, t, cursor))
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// Audio thread
// ---------------------------------------------------------------------------

/// Core audio thread loop.
fn audio_thread_main(
    command_rx: mpsc::Receiver<PlayerCommand>,
    shared_state: SharedPlayerState,
    app: AppHandle,
    rt: tokio::runtime::Handle,
) {
    let (_stream, stream_handle) = match OutputStream::try_default() {
        Ok(s) => s,
        Err(e) => {
            log::error!("[player] Failed to open audio output: {}", e);
            emit_event(
                &app,
                "player:error",
                PlayerErrorPayload {
                    track_id: None,
                    message: format!("Audio output unavailable: {}", e),
                },
            );
            return;
        }
    };

    let sink = Sink::try_new(&stream_handle).expect("Failed to create audio sink");
    sink.pause();

    let mut last_progress_emit = Instant::now();
    let mut playback_start_time: Option<Instant> = None;
    let mut playback_offset_ms: u64 = 0;
    let mut load_generation: u64 = 0;

    // Currently pending background load, if any.
    let mut pending_load: Option<(
        tokio::sync::oneshot::Receiver<Result<(Vec<u8>, StreamCodec), String>>,
        PlaybackItem,
        usize, // cursor at time of load
    )> = None;

    loop {
        let mut ctx = PlaybackContext {
            sink: &sink,
            shared_state: &shared_state,
            app: &app,
            rt: &rt,
            playback_start_time: &mut playback_start_time,
            playback_offset_ms: &mut playback_offset_ms,
            load_generation: &mut load_generation,
        };

        // ── Check for completed background load ──
        if let Some((ref mut rx, ref track, cursor)) = pending_load {
            match rx.try_recv() {
                Ok(Ok((audio_bytes, codec))) => {
                    let track_clone = track.clone();
                    pending_load = None;
                    play_loaded_audio(audio_bytes, codec, &track_clone, cursor, &mut ctx);
                }
                Ok(Err(msg)) => {
                    if msg != "Load cancelled" {
                        log::error!("[player] Failed to load track: {}", msg);
                        update_state(&rt, &shared_state, |s| {
                            s.state = PlaybackState::Stopped;
                        });
                        emit_event(
                            &app,
                            "player:error",
                            PlayerErrorPayload {
                                track_id: Some(track.track_id),
                                message: msg,
                            },
                        );
                    }
                    pending_load = None;
                }
                Err(tokio::sync::oneshot::error::TryRecvError::Empty) => {
                    // Still loading — continue processing commands
                }
                Err(tokio::sync::oneshot::error::TryRecvError::Closed) => {
                    log::warn!("[player] Loader channel closed unexpectedly");
                    pending_load = None;
                }
            }
        }

        // ── Process commands ──
        match command_rx.recv_timeout(Duration::from_millis(50)) {
            Ok(cmd) => match cmd {
                PlayerCommand::Play { queue, index } => {
                    let track = match queue.get(index) {
                        Some(t) => t.clone(),
                        None => {
                            log::error!("[player] Play index {} out of bounds", index);
                            emit_event(
                                &app,
                                "player:error",
                                PlayerErrorPayload {
                                    track_id: None,
                                    message: format!(
                                        "Play index {} out of bounds (queue size {})",
                                        index,
                                        queue.len()
                                    ),
                                },
                            );
                            continue;
                        }
                    };

                    // Cancel any in-flight load
                    pending_load = None;
                    sink.clear();

                    update_state(&rt, &shared_state, |s| {
                        s.queue = queue;
                    });

                    let (rx, loaded_track) = begin_track_load(&track, index, &mut ctx);
                    pending_load = Some((rx, loaded_track, index));
                }

                PlayerCommand::Pause => {
                    sink.pause();
                    if let Some(start) = playback_start_time.take() {
                        playback_offset_ms += start.elapsed().as_millis() as u64;
                    }

                    let track_id = read_state(&rt, &shared_state, |s| {
                        s.queue.get(s.cursor).map(|t| t.track_id)
                    });

                    update_state(&rt, &shared_state, |s| {
                        s.state = PlaybackState::Paused;
                        s.position_ms = playback_offset_ms;
                    });

                    emit_event(
                        &app,
                        "player:state-changed",
                        PlayerStateChangedPayload {
                            state: PlaybackState::Paused,
                            track_id,
                        },
                    );
                }

                PlayerCommand::Resume => {
                    sink.play();
                    playback_start_time = Some(Instant::now());

                    let track_id = read_state(&rt, &shared_state, |s| {
                        s.queue.get(s.cursor).map(|t| t.track_id)
                    });

                    update_state(&rt, &shared_state, |s| {
                        s.state = PlaybackState::Playing;
                    });

                    emit_event(
                        &app,
                        "player:state-changed",
                        PlayerStateChangedPayload {
                            state: PlaybackState::Playing,
                            track_id,
                        },
                    );
                }

                PlayerCommand::Stop => {
                    pending_load = None;
                    stop_playback(&mut ctx);
                }

                PlayerCommand::Seek { position_ms } => {
                    match sink.try_seek(Duration::from_millis(position_ms)) {
                        Ok(()) => {
                            playback_offset_ms = position_ms;
                            playback_start_time = if sink.is_paused() {
                                None
                            } else {
                                Some(Instant::now())
                            };

                            update_state(&rt, &shared_state, |s| {
                                s.position_ms = position_ms;
                            });
                        }
                        Err(e) => {
                            log::warn!("[player] Seek failed: {}", e);
                        }
                    }
                }

                PlayerCommand::SetVolume { volume } => {
                    let clamped = volume.clamp(0.0, 1.0);
                    sink.set_volume(clamped);
                    update_state(&rt, &shared_state, |s| {
                        s.volume = clamped;
                    });
                }

                PlayerCommand::Next => {
                    pending_load = None;
                    sink.clear();
                    if let Some((rx, track, cursor)) = advance_next(&mut ctx) {
                        pending_load = Some((rx, track, cursor));
                    }
                }

                PlayerCommand::Previous => {
                    pending_load = None;
                    sink.clear();
                    if let Some((rx, track, cursor)) = advance_previous(&mut ctx) {
                        pending_load = Some((rx, track, cursor));
                    }
                }

                PlayerCommand::Reorder {
                    from_index,
                    to_index,
                } => {
                    let result = rt.block_on(async {
                        let mut s = shared_state.lock().await;
                        let result = s.reorder(from_index, to_index);
                        result.map(|_| (s.cursor, s.queue.len()))
                    });

                    if let Ok((cursor, queue_len)) = result {
                        emit_event(
                            &app,
                            "player:queue-updated",
                            PlayerQueueUpdatedPayload {
                                action: QueueAction::Reorder,
                                cursor,
                                queue_length: queue_len,
                            },
                        );
                    }
                }

                PlayerCommand::Remove { index } => {
                    let result = rt.block_on(async {
                        let mut s = shared_state.lock().await;
                        let result = s.remove(index);
                        result.map(|_| (s.cursor, s.queue.len()))
                    });

                    match result {
                        Ok((cursor, queue_len)) => {
                            emit_event(
                                &app,
                                "player:queue-updated",
                                PlayerQueueUpdatedPayload {
                                    action: QueueAction::Remove,
                                    cursor,
                                    queue_length: queue_len,
                                },
                            );
                        }
                        Err(e) => {
                            log::warn!("[player] Remove failed: {}", e);
                        }
                    }
                }
            },

            Err(mpsc::RecvTimeoutError::Timeout) => {
                let current_state = read_state(&rt, &shared_state, |s| s.state);

                if current_state == PlaybackState::Playing {
                    // Track ended — advance to next
                    if sink.empty() {
                        if let Some((rx, track, cursor)) = advance_next(&mut ctx) {
                            pending_load = Some((rx, track, cursor));
                        }
                        continue;
                    }

                    // Progress updates every 250ms (single lock acquisition)
                    if last_progress_emit.elapsed() >= Duration::from_millis(250) {
                        let position = if let Some(start) = playback_start_time {
                            playback_offset_ms + start.elapsed().as_millis() as u64
                        } else {
                            playback_offset_ms
                        };

                        let duration = update_state_and_read(
                            &rt,
                            &shared_state,
                            position,
                        );

                        emit_event(
                            &app,
                            "player:progress",
                            PlayerProgressPayload {
                                position_ms: position,
                                duration_ms: duration,
                            },
                        );

                        last_progress_emit = Instant::now();
                    }
                }
            }

            Err(mpsc::RecvTimeoutError::Disconnected) => {
                log::info!("[player] Command channel disconnected, shutting down audio thread");
                break;
            }
        }
    }
}

/// Combined update + read in a single lock acquisition for progress tracking.
fn update_state_and_read(
    rt: &tokio::runtime::Handle,
    shared: &SharedPlayerState,
    position: u64,
) -> u64 {
    rt.block_on(async {
        let mut s = shared.lock().await;
        s.position_ms = position;
        s.duration_ms
    })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_item(id: u64) -> PlaybackItem {
        PlaybackItem {
            track_id: id,
            track_url: format!("https://soundcloud.com/test/track-{}", id),
            title: format!("Track {}", id),
            artist: "Test".into(),
            artwork_url: None,
            duration_ms: 180000,
        }
    }

    fn make_state(count: usize, cursor: usize) -> PlayerState {
        PlayerState {
            queue: (1..=count as u64).map(make_item).collect(),
            cursor,
            state: PlaybackState::Playing,
            volume: 1.0,
            position_ms: 0,
            duration_ms: 0,
        }
    }

    #[test]
    fn test_reorder_before_to_after_decrements_cursor() {
        let mut state = make_state(5, 2);
        state.reorder(0, 4).unwrap();
        assert_eq!(state.cursor, 1);
    }

    #[test]
    fn test_reorder_after_to_before_increments_cursor() {
        let mut state = make_state(5, 2);
        state.reorder(4, 1).unwrap();
        assert_eq!(state.cursor, 3);
    }

    #[test]
    fn test_reorder_current_track_moves_cursor() {
        let mut state = make_state(5, 2);
        state.reorder(2, 4).unwrap();
        assert_eq!(state.cursor, 4);
    }

    #[test]
    fn test_remove_before_cursor_decrements() {
        let mut state = make_state(5, 3);
        state.remove(1).unwrap();
        assert_eq!(state.cursor, 2);
        assert_eq!(state.queue.len(), 4);
    }

    #[test]
    fn test_remove_after_cursor_no_change() {
        let mut state = make_state(5, 1);
        state.remove(3).unwrap();
        assert_eq!(state.cursor, 1);
    }

    #[test]
    fn test_remove_current_track_fails() {
        let mut state = make_state(5, 2);
        assert!(state.remove(2).is_err());
    }

    #[test]
    fn test_get_snapshot_empty_queue() {
        let state = PlayerState {
            queue: Vec::new(),
            cursor: 0,
            state: PlaybackState::Stopped,
            volume: 0.75,
            position_ms: 0,
            duration_ms: 0,
        };
        let snap = state.get_snapshot();
        assert_eq!(snap.state, PlaybackState::Stopped);
        assert!(snap.current_track.is_none());
        assert_eq!(snap.volume, 0.75);
    }

    #[test]
    fn test_get_snapshot_with_queue() {
        let state = make_state(3, 1);
        let snap = state.get_snapshot();
        assert_eq!(snap.cursor, 1);
        assert_eq!(snap.queue.len(), 3);
        assert_eq!(snap.current_track.unwrap().track_id, 2);
    }

    #[test]
    fn test_reorder_out_of_bounds() {
        let mut state = make_state(3, 0);
        assert!(state.reorder(5, 0).is_err());
        assert!(state.reorder(0, 5).is_err());
    }

    #[test]
    fn test_remove_out_of_bounds() {
        let mut state = make_state(3, 0);
        assert!(state.remove(5).is_err());
    }

    #[test]
    fn test_parse_m3u8_segments_absolute_urls() {
        let playlist = "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nhttps://cdn.example.com/seg1.ts\n#EXTINF:10,\nhttps://cdn.example.com/seg2.ts\n#EXT-X-ENDLIST";
        let segments = parse_m3u8_segments(playlist, "https://api.example.com/playlist.m3u8");
        assert_eq!(segments.len(), 2);
        assert_eq!(segments[0], "https://cdn.example.com/seg1.ts");
        assert_eq!(segments[1], "https://cdn.example.com/seg2.ts");
    }

    #[test]
    fn test_parse_m3u8_segments_relative_urls() {
        let playlist = "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nseg1.ts\n#EXTINF:10,\nseg2.ts\n#EXT-X-ENDLIST";
        let segments =
            parse_m3u8_segments(playlist, "https://cdn.example.com/path/playlist.m3u8");
        assert_eq!(segments.len(), 2);
        assert_eq!(segments[0], "https://cdn.example.com/path/seg1.ts");
        assert_eq!(segments[1], "https://cdn.example.com/path/seg2.ts");
    }

    #[test]
    fn test_parse_m3u8_segments_empty_playlist() {
        let playlist = "#EXTM3U\n#EXT-X-ENDLIST";
        let segments = parse_m3u8_segments(playlist, "https://example.com/playlist.m3u8");
        assert!(segments.is_empty());
    }
}
