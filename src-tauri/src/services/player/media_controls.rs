use std::cell::RefCell;
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, Instant};

use once_cell::sync::Lazy;
use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback as OsPlayback, MediaPosition, PlatformConfig};

use super::emitter::PlayerEvent;
use super::media_state::{MediaPlayback, MediaStateTracker, MediaUpdate};
use super::messages::PlayerMediaMetadata;
use crate::services::events::{emit_player_media_key, PlayerMediaKeyAction};

#[cfg(target_os = "windows")]
const MAIN_WINDOW_LABEL: &str = "main";

thread_local! {
    static CONTROLS: RefCell<Option<MediaControls>> = const { RefCell::new(None) };
}

static AVAILABLE: AtomicBool = AtomicBool::new(false);
static TRACKER: Lazy<Mutex<MediaStateTracker>> = Lazy::new(|| Mutex::new(MediaStateTracker::default()));
static METADATA: Lazy<Mutex<Option<PlayerMediaMetadata>>> = Lazy::new(|| Mutex::new(None));

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|p| p.into_inner())
}

pub fn init(app: &tauri::AppHandle) {
    let handle = app.clone();
    if let Err(e) = app.run_on_main_thread(move || init_on_main_thread(&handle)) {
        log::error!("[player::media_controls] Could not schedule init on the main thread; continuing without media controls: {}", e);
    }
}

fn init_on_main_thread(app: &tauri::AppHandle) {
    match create_controls(app) {
        Ok(controls) => {
            CONTROLS.with(|cell| *cell.borrow_mut() = Some(controls));
            AVAILABLE.store(true, Ordering::SeqCst);
            log::info!("[player::media_controls] OS media controls initialised");
        }
        Err(message) => log::error!("[player::media_controls] OS media controls unavailable; continuing without them: {}", message),
    }
}

fn create_controls(app: &tauri::AppHandle) -> Result<MediaControls, String> {
    let hwnd = main_window_hwnd(app)?;
    log::info!("[player::media_controls] Creating media controls (hwnd present={})", hwnd.is_some());
    let config = PlatformConfig { dbus_name: "com.infrabooth.downloader", display_name: "InfraBooth Downloader", hwnd };
    let mut controls = MediaControls::new(config).map_err(|e| format!("MediaControls::new failed: {e:?}"))?;
    let emitter = app.clone();
    controls.attach(move |event| on_control_event(&emitter, event)).map_err(|e| format!("MediaControls::attach failed: {e:?}"))?;
    Ok(controls)
}

#[cfg(target_os = "windows")]
fn main_window_hwnd(app: &tauri::AppHandle) -> Result<Option<*mut c_void>, String> {
    use tauri::Manager;
    let window = app.get_webview_window(MAIN_WINDOW_LABEL).ok_or_else(|| format!("window '{MAIN_WINDOW_LABEL}' not found"))?;
    let hwnd = window.hwnd().map_err(|e| format!("main window HWND unavailable: {e}"))?;
    Ok(Some(hwnd.0))
}

#[cfg(not(target_os = "windows"))]
fn main_window_hwnd(_app: &tauri::AppHandle) -> Result<Option<*mut c_void>, String> {
    Ok(None)
}

fn on_control_event(app: &tauri::AppHandle, event: MediaControlEvent) {
    log::info!("[player::media_controls] OS media control event: {:?}", event);
    match map_control_event(&event) {
        Some(action) => emit_player_media_key(app, action),
        None => log::debug!("[player::media_controls] Ignoring media control event without a handler"),
    }
}

pub fn map_control_event(event: &MediaControlEvent) -> Option<PlayerMediaKeyAction> {
    match event {
        MediaControlEvent::Play => Some(PlayerMediaKeyAction::Play),
        MediaControlEvent::Pause => Some(PlayerMediaKeyAction::Pause),
        MediaControlEvent::Toggle => Some(PlayerMediaKeyAction::Toggle),
        MediaControlEvent::Next => Some(PlayerMediaKeyAction::Next),
        MediaControlEvent::Previous => Some(PlayerMediaKeyAction::Previous),
        MediaControlEvent::SetPosition(MediaPosition(position)) => Some(PlayerMediaKeyAction::Seek { position_ms: position.as_millis() as u64 }),
        _ => None,
    }
}

pub fn set_metadata(app: &tauri::AppHandle, metadata: Option<PlayerMediaMetadata>) {
    match &metadata {
        Some(m) => {
            log::info!("[player::media_controls] Metadata: '{}' by '{}' ({}ms, artwork={})", m.title, m.artist, m.duration_ms, m.artwork_url.is_some());
            lock(&TRACKER).reset_duration(m.duration_ms);
        }
        None => log::info!("[player::media_controls] Metadata cleared"),
    }
    *lock(&METADATA) = metadata.clone();
    run_on_main(app, move |controls| apply_metadata(controls, metadata.as_ref()));
}

pub fn on_player_event(app: &tauri::AppHandle, event: &PlayerEvent) {
    if !AVAILABLE.load(Ordering::Relaxed) {
        return;
    }
    let now = Instant::now();
    let updates = match event {
        PlayerEvent::StateChanged(state) => lock(&TRACKER).on_state(*state, now).into_iter().collect(),
        PlayerEvent::Progress { position_ms, duration_ms } => lock(&TRACKER).on_progress(*position_ms, *duration_ms, now),
        _ => Vec::new(),
    };
    for update in updates {
        apply_update(app, update);
    }
}

fn apply_update(app: &tauri::AppHandle, update: MediaUpdate) {
    match update {
        MediaUpdate::Playback(playback) => {
            log::debug!("[player::media_controls] Playback -> {:?}", playback);
            run_on_main(app, move |controls| {
                if let Err(e) = controls.set_playback(to_os_playback(playback)) {
                    log::warn!("[player::media_controls] set_playback failed: {:?}", e);
                }
            });
        }
        MediaUpdate::Duration(duration_ms) => {
            let Some(metadata) = lock(&METADATA).clone().map(|m| PlayerMediaMetadata { duration_ms, ..m }) else {
                return;
            };
            log::debug!("[player::media_controls] Duration -> {}ms", duration_ms);
            run_on_main(app, move |controls| apply_metadata(controls, Some(&metadata)));
        }
    }
}

fn apply_metadata(controls: &mut MediaControls, metadata: Option<&PlayerMediaMetadata>) {
    let result = match metadata {
        Some(m) => controls.set_metadata(MediaMetadata {
            title: Some(&m.title),
            artist: Some(&m.artist),
            album: None,
            cover_url: m.artwork_url.as_deref(),
            duration: (m.duration_ms > 0).then(|| Duration::from_millis(m.duration_ms)),
        }),
        None => controls.set_metadata(MediaMetadata::default()).and_then(|_| controls.set_playback(OsPlayback::Stopped)),
    };
    if let Err(e) = result {
        log::warn!("[player::media_controls] set_metadata failed: {:?}", e);
    }
}

fn to_os_playback(playback: MediaPlayback) -> OsPlayback {
    match playback {
        MediaPlayback::Playing { position_ms } => OsPlayback::Playing { progress: Some(MediaPosition(Duration::from_millis(position_ms))) },
        MediaPlayback::Paused { position_ms } => OsPlayback::Paused { progress: Some(MediaPosition(Duration::from_millis(position_ms))) },
        MediaPlayback::Stopped => OsPlayback::Stopped,
    }
}

fn run_on_main(app: &tauri::AppHandle, f: impl FnOnce(&mut MediaControls) + Send + 'static) {
    if !AVAILABLE.load(Ordering::Relaxed) {
        return;
    }
    let result = app.run_on_main_thread(move || {
        CONTROLS.with(|cell| {
            if let Some(controls) = cell.borrow_mut().as_mut() {
                f(controls);
            }
        });
    });
    if let Err(e) = result {
        log::warn!("[player::media_controls] run_on_main_thread failed: {}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use souvlaki::SeekDirection;

    #[test]
    fn maps_supported_control_events() {
        assert_eq!(map_control_event(&MediaControlEvent::Play), Some(PlayerMediaKeyAction::Play));
        assert_eq!(map_control_event(&MediaControlEvent::Pause), Some(PlayerMediaKeyAction::Pause));
        assert_eq!(map_control_event(&MediaControlEvent::Toggle), Some(PlayerMediaKeyAction::Toggle));
        assert_eq!(map_control_event(&MediaControlEvent::Next), Some(PlayerMediaKeyAction::Next));
        assert_eq!(map_control_event(&MediaControlEvent::Previous), Some(PlayerMediaKeyAction::Previous));
        assert_eq!(
            map_control_event(&MediaControlEvent::SetPosition(MediaPosition(Duration::from_millis(1234)))),
            Some(PlayerMediaKeyAction::Seek { position_ms: 1234 })
        );
    }

    #[test]
    fn ignores_events_without_a_handler_today() {
        assert_eq!(map_control_event(&MediaControlEvent::Stop), None);
        assert_eq!(map_control_event(&MediaControlEvent::Seek(SeekDirection::Forward)), None);
        assert_eq!(map_control_event(&MediaControlEvent::SeekBy(SeekDirection::Backward, Duration::from_secs(5))), None);
    }

    #[test]
    fn maps_playback_to_souvlaki() {
        assert!(matches!(to_os_playback(MediaPlayback::Stopped), OsPlayback::Stopped));
        match to_os_playback(MediaPlayback::Playing { position_ms: 1500 }) {
            OsPlayback::Playing { progress: Some(MediaPosition(position)) } => assert_eq!(position, Duration::from_millis(1500)),
            other => panic!("unexpected {other:?}"),
        }
    }
}
