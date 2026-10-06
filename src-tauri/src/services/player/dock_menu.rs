#![cfg_attr(not(target_os = "macos"), allow(dead_code))]

use std::sync::{Mutex, MutexGuard};

use super::messages::DockMenuState;
use crate::services::events::{emit_player_media_key, PlayerMediaKeyAction};

pub const MENU_ID_PREFIX: &str = "dock:";
pub const ID_TITLE: &str = "dock:title";
pub const ID_TOGGLE: &str = "dock:toggle";
pub const ID_NEXT: &str = "dock:next";
pub const ID_PREVIOUS: &str = "dock:previous";
pub const ID_SHUFFLE: &str = "dock:shuffle";

static LAST_STATE: Mutex<Option<DockMenuState>> = Mutex::new(None);

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|p| p.into_inner())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DockMenuView {
    pub title: String,
    pub toggle_label: String,
    pub next_label: String,
    pub previous_label: String,
    pub shuffle_label: String,
    pub transport_enabled: bool,
    pub shuffle_checked: bool,
}

impl DockMenuView {
    pub fn from_state(state: &DockMenuState) -> Self {
        let labels = &state.labels;
        Self {
            title: state.title.clone().unwrap_or_else(|| labels.not_playing.clone()),
            toggle_label: if state.is_playing { labels.pause.clone() } else { labels.play.clone() },
            next_label: labels.next.clone(),
            previous_label: labels.previous.clone(),
            shuffle_label: labels.shuffle.clone(),
            transport_enabled: state.has_track,
            shuffle_checked: state.shuffle,
        }
    }
}

pub fn map_menu_id(id: &str) -> Option<PlayerMediaKeyAction> {
    match id {
        ID_TOGGLE => Some(PlayerMediaKeyAction::Toggle),
        ID_NEXT => Some(PlayerMediaKeyAction::Next),
        ID_PREVIOUS => Some(PlayerMediaKeyAction::Previous),
        ID_SHUFFLE => Some(PlayerMediaKeyAction::ToggleShuffle),
        _ => None,
    }
}

pub(super) fn remember_state(state: DockMenuState) {
    *lock(&LAST_STATE) = Some(state);
}

pub(super) fn current_view() -> DockMenuView {
    DockMenuView::from_state(&lock(&LAST_STATE).clone().unwrap_or_default())
}

pub fn init(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    super::dock_menu_macos::init(app);
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        log::debug!("[player::dock_menu] Dock menu is macOS-only; skipping init");
    }
}

pub fn set_state(app: &tauri::AppHandle, state: DockMenuState) {
    log::debug!(
        "[player::dock_menu] State: title present={} playing={} has_track={} shuffle={}",
        state.title.is_some(),
        state.is_playing,
        state.has_track,
        state.shuffle
    );
    remember_state(state);
    apply(app, current_view());
}

pub fn handle_menu_event(app: &tauri::AppHandle, id: &str) {
    if !id.starts_with(MENU_ID_PREFIX) {
        return;
    }
    log::info!("[player::dock_menu] Dock menu click: {}", id);
    match map_menu_id(id) {
        Some(action) => emit_player_media_key(app, action),
        None => log::debug!("[player::dock_menu] No action for dock menu id {}", id),
    }
    // muda toggles a CheckMenuItem itself before emitting; restore the last known state until the frontend pushes the new one.
    apply(app, current_view());
}

#[cfg(target_os = "macos")]
fn apply(app: &tauri::AppHandle, view: DockMenuView) {
    super::dock_menu_macos::apply(app, view);
}

#[cfg(not(target_os = "macos"))]
fn apply(_app: &tauri::AppHandle, _view: DockMenuView) {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::player::messages::DockMenuLabels;

    fn state(title: Option<&str>, is_playing: bool, shuffle: bool) -> DockMenuState {
        DockMenuState { title: title.map(Into::into), is_playing, has_track: title.is_some(), shuffle, labels: DockMenuLabels::default() }
    }

    #[test]
    fn maps_transport_ids_to_media_key_actions() {
        assert_eq!(map_menu_id(ID_TOGGLE), Some(PlayerMediaKeyAction::Toggle));
        assert_eq!(map_menu_id(ID_NEXT), Some(PlayerMediaKeyAction::Next));
        assert_eq!(map_menu_id(ID_PREVIOUS), Some(PlayerMediaKeyAction::Previous));
        assert_eq!(map_menu_id(ID_SHUFFLE), Some(PlayerMediaKeyAction::ToggleShuffle));
    }

    #[test]
    fn ignores_title_and_foreign_ids() {
        assert_eq!(map_menu_id(ID_TITLE), None);
        assert_eq!(map_menu_id("settings"), None);
        assert_eq!(map_menu_id("dock:unknown"), None);
    }

    #[test]
    fn view_without_track_shows_not_playing_and_disables_transport() {
        let view = DockMenuView::from_state(&DockMenuState::default());
        assert_eq!(view.title, "Not Playing");
        assert_eq!(view.toggle_label, "Play");
        assert!(!view.transport_enabled);
        assert!(!view.shuffle_checked);
    }

    #[test]
    fn view_while_playing_offers_pause_and_checks_the_active_modes() {
        let view = DockMenuView::from_state(&state(Some("Song — Artist"), true, true));
        assert_eq!(view.title, "Song — Artist");
        assert_eq!(view.toggle_label, "Pause");
        assert!(view.transport_enabled);
        assert!(view.shuffle_checked);
    }

    #[test]
    fn current_view_reflects_the_last_remembered_state() {
        remember_state(state(Some("X — Y"), false, false));
        let view = current_view();
        assert_eq!(view.title, "X — Y");
        assert_eq!(view.toggle_label, "Play");
    }
}
