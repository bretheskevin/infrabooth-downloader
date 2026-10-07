#![cfg_attr(not(target_os = "macos"), allow(dead_code))]

use std::ops::RangeInclusive;
use std::sync::{Mutex, MutexGuard};

use super::equalizer::EqualizerPreset;
use super::messages::{DockMenuSettings, DockMenuState, CROSSFADE_DURATION_RANGE, PARALLEL_RANGE};
use crate::services::events::{emit_dock_setting, emit_player_media_key, DockSettingAction, PlayerMediaKeyAction};

pub const MENU_ID_PREFIX: &str = "dock:";
pub const ID_TITLE: &str = "dock:title";
pub const ID_TOGGLE: &str = "dock:toggle";
pub const ID_NEXT: &str = "dock:next";
pub const ID_PREVIOUS: &str = "dock:previous";
pub const ID_SHUFFLE: &str = "dock:shuffle";
pub const ID_SETTINGS_MENU: &str = "dock:settings";
pub const ID_CROSSFADE: &str = "dock:crossfade";
pub const ID_CROSSFADE_DURATION_MENU: &str = "dock:crossfade-duration";
pub const ID_PARALLEL_MENU: &str = "dock:parallel";
pub const ID_EQUALIZER: &str = "dock:equalizer";
pub const ID_EQUALIZER_PRESET_MENU: &str = "dock:equalizer-preset";
const EQUALIZER_PRESET_ID_PREFIX: &str = "dock:equalizer-preset:";
const CROSSFADE_DURATION_ID_PREFIX: &str = "dock:crossfade-duration:";
const PARALLEL_ID_PREFIX: &str = "dock:parallel:";

static LAST_STATE: Mutex<Option<DockMenuState>> = Mutex::new(None);

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|p| p.into_inner())
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DockChoiceView {
    pub id: String,
    pub label: String,
    pub checked: bool,
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
    pub settings_label: String,
    pub crossfade_label: String,
    pub crossfade_checked: bool,
    pub crossfade_duration_label: String,
    pub crossfade_duration_choices: Vec<DockChoiceView>,
    pub equalizer_label: String,
    pub equalizer_checked: bool,
    pub equalizer_preset_label: String,
    pub equalizer_preset_choices: Vec<DockChoiceView>,
    pub parallel_label: String,
    pub parallel_choices: Vec<DockChoiceView>,
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
            settings_label: labels.settings_menu.clone(),
            crossfade_label: labels.crossfade.clone(),
            crossfade_checked: state.settings.crossfade_enabled,
            crossfade_duration_label: labels.crossfade_duration.clone(),
            crossfade_duration_choices: crossfade_duration_choices(state),
            equalizer_label: labels.equalizer.clone(),
            equalizer_checked: state.settings.equalizer_enabled,
            equalizer_preset_label: labels.equalizer_preset.clone(),
            equalizer_preset_choices: equalizer_preset_choices(state),
            parallel_label: labels.parallel_downloads.clone(),
            parallel_choices: parallel_choices(state),
        }
    }
}

pub fn crossfade_duration_id(seconds: u8) -> String {
    format!("{CROSSFADE_DURATION_ID_PREFIX}{seconds}")
}

pub fn parallel_id(count: u8) -> String {
    format!("{PARALLEL_ID_PREFIX}{count}")
}

fn crossfade_duration_choices(state: &DockMenuState) -> Vec<DockChoiceView> {
    CROSSFADE_DURATION_RANGE
        .map(|seconds| DockChoiceView {
            id: crossfade_duration_id(seconds),
            label: state.labels.crossfade_seconds.get(usize::from(seconds) - 1).cloned().unwrap_or_else(|| format!("{seconds}s")),
            checked: seconds == state.settings.crossfade_duration,
        })
        .collect()
}

fn parallel_choices(state: &DockMenuState) -> Vec<DockChoiceView> {
    PARALLEL_RANGE
        .map(|count| DockChoiceView {
            id: parallel_id(count),
            label: if count == 1 { state.labels.sequential.clone() } else { count.to_string() },
            checked: count == state.settings.max_concurrent_downloads,
        })
        .collect()
}

pub fn equalizer_preset_id(preset: EqualizerPreset) -> String {
    format!("{EQUALIZER_PRESET_ID_PREFIX}{}", preset.id())
}

fn equalizer_preset_choices(state: &DockMenuState) -> Vec<DockChoiceView> {
    EqualizerPreset::BUILT_IN
        .iter()
        .enumerate()
        .map(|(index, preset)| DockChoiceView {
            id: equalizer_preset_id(*preset),
            label: state.labels.equalizer_preset_names.get(index).cloned().unwrap_or_else(|| preset.default_label().to_string()),
            checked: *preset == state.settings.equalizer_preset,
        })
        .collect()
}

fn parse_preset(id: &str, raw: &str) -> Option<EqualizerPreset> {
    let preset = EqualizerPreset::from_built_in_id(raw);
    if preset.is_none() {
        log::warn!("[player::dock_menu] Rejected dock menu id {}: '{}' is not a built-in equalizer preset", id, raw);
    }
    preset
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

pub fn map_settings_id(id: &str, settings: &DockMenuSettings) -> Option<DockSettingAction> {
    if id == ID_CROSSFADE {
        return Some(DockSettingAction::SetCrossfade { enabled: !settings.crossfade_enabled });
    }
    if let Some(raw) = id.strip_prefix(CROSSFADE_DURATION_ID_PREFIX) {
        return parse_choice(id, raw, CROSSFADE_DURATION_RANGE).map(|seconds| DockSettingAction::SetCrossfadeDuration { seconds });
    }
    if let Some(raw) = id.strip_prefix(PARALLEL_ID_PREFIX) {
        return parse_choice(id, raw, PARALLEL_RANGE).map(|count| DockSettingAction::SetMaxConcurrentDownloads { count });
    }
    if id == ID_EQUALIZER {
        return Some(DockSettingAction::SetEqualizer { enabled: !settings.equalizer_enabled });
    }
    if let Some(raw) = id.strip_prefix(EQUALIZER_PRESET_ID_PREFIX) {
        return parse_preset(id, raw).map(|preset| DockSettingAction::SetEqualizerPreset { preset });
    }
    None
}

fn parse_choice(id: &str, raw: &str, range: RangeInclusive<u8>) -> Option<u8> {
    match raw.parse::<u8>() {
        Ok(value) if range.contains(&value) => Some(value),
        Ok(value) => {
            log::warn!("[player::dock_menu] Rejected dock menu id {}: value {} outside {:?}", id, value, range);
            None
        }
        Err(e) => {
            log::warn!("[player::dock_menu] Rejected dock menu id {}: cannot parse '{}': {}", id, raw, e);
            None
        }
    }
}

pub(super) fn remember_state(state: DockMenuState) {
    *lock(&LAST_STATE) = Some(state);
}

pub(super) fn current_view() -> DockMenuView {
    DockMenuView::from_state(&lock(&LAST_STATE).clone().unwrap_or_default())
}

pub(super) fn current_settings() -> DockMenuSettings {
    lock(&LAST_STATE).as_ref().map(|state| state.settings).unwrap_or_default()
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
        "[player::dock_menu] State: title present={} playing={} has_track={} shuffle={} crossfade={} duration={}s parallel={} equalizer={} preset={:?}",
        state.title.is_some(),
        state.is_playing,
        state.has_track,
        state.shuffle,
        state.settings.crossfade_enabled,
        state.settings.crossfade_duration,
        state.settings.max_concurrent_downloads,
        state.settings.equalizer_enabled,
        state.settings.equalizer_preset
    );
    remember_state(state);
    apply(app, current_view());
}

pub fn handle_menu_event(app: &tauri::AppHandle, id: &str) {
    if !id.starts_with(MENU_ID_PREFIX) {
        return;
    }
    log::info!("[player::dock_menu] Dock menu click: {}", id);
    dispatch_menu_id(app, id);
    // muda toggles a CheckMenuItem itself before emitting; restore the last known state until the frontend pushes the new one.
    apply(app, current_view());
}

fn dispatch_menu_id(app: &tauri::AppHandle, id: &str) {
    if let Some(action) = map_menu_id(id) {
        log::debug!("[player::dock_menu] Transport action {:?} for id {}", action, id);
        emit_player_media_key(app, action);
        return;
    }
    let settings = current_settings();
    match map_settings_id(id, &settings) {
        Some(action) => {
            log::info!("[player::dock_menu] Settings action {:?} for id {} (remembered {:?})", action, id, settings);
            emit_dock_setting(app, action);
        }
        None => log::debug!("[player::dock_menu] No action for dock menu id {}", id),
    }
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
    use crate::services::player::equalizer::EqualizerPreset;
    use crate::services::player::messages::{DockMenuLabels, DockMenuSettings};

    fn state(title: Option<&str>, is_playing: bool, shuffle: bool) -> DockMenuState {
        DockMenuState {
            title: title.map(Into::into),
            is_playing,
            has_track: title.is_some(),
            shuffle,
            settings: DockMenuSettings::default(),
            labels: DockMenuLabels::default(),
        }
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

    fn settings(crossfade_enabled: bool, crossfade_duration: u8, max_concurrent_downloads: u8) -> DockMenuSettings {
        DockMenuSettings { crossfade_enabled, crossfade_duration, max_concurrent_downloads, ..DockMenuSettings::default() }
    }

    fn equalizer_settings(enabled: bool, preset: EqualizerPreset) -> DockMenuSettings {
        DockMenuSettings { equalizer_enabled: enabled, equalizer_preset: preset, ..DockMenuSettings::default() }
    }

    #[test]
    fn equalizer_id_inverts_the_remembered_equalizer_state() {
        assert_eq!(map_settings_id(ID_EQUALIZER, &equalizer_settings(false, EqualizerPreset::Flat)), Some(DockSettingAction::SetEqualizer { enabled: true }));
        assert_eq!(map_settings_id(ID_EQUALIZER, &equalizer_settings(true, EqualizerPreset::Flat)), Some(DockSettingAction::SetEqualizer { enabled: false }));
    }

    #[test]
    fn maps_built_in_preset_ids() {
        let s = DockMenuSettings::default();
        for preset in EqualizerPreset::BUILT_IN {
            assert_eq!(map_settings_id(&equalizer_preset_id(preset), &s), Some(DockSettingAction::SetEqualizerPreset { preset }));
        }
    }

    #[test]
    fn rejects_custom_unknown_and_submenu_preset_ids() {
        let s = DockMenuSettings::default();
        for id in ["dock:equalizer-preset:custom", "dock:equalizer-preset:", "dock:equalizer-preset:loud", ID_EQUALIZER_PRESET_MENU] {
            assert_eq!(map_settings_id(id, &s), None, "id {id} should be rejected");
        }
        assert_eq!(map_menu_id(ID_EQUALIZER), None);
    }

    #[test]
    fn view_checks_the_current_preset_and_none_when_custom() {
        let mut s = DockMenuState { settings: equalizer_settings(true, EqualizerPreset::Vocal), ..DockMenuState::default() };
        let view = DockMenuView::from_state(&s);
        assert!(view.equalizer_checked);
        assert_eq!(view.equalizer_preset_choices.len(), 7);
        let checked: Vec<_> = view.equalizer_preset_choices.iter().filter(|c| c.checked).map(|c| c.id.as_str()).collect();
        assert_eq!(checked, vec!["dock:equalizer-preset:vocal"]);

        s.settings = equalizer_settings(false, EqualizerPreset::Custom);
        let view = DockMenuView::from_state(&s);
        assert!(!view.equalizer_checked);
        assert!(view.equalizer_preset_choices.iter().all(|c| !c.checked));
    }

    #[test]
    fn view_uses_translated_preset_names_and_falls_back_when_missing() {
        let mut s = DockMenuState::default();
        s.labels.equalizer = "Égaliseur".into();
        s.labels.equalizer_preset_names = vec!["Plat".into()];
        let view = DockMenuView::from_state(&s);
        assert_eq!(view.equalizer_label, "Égaliseur");
        assert_eq!(view.equalizer_preset_label, "Equalizer preset");
        assert_eq!(view.equalizer_preset_choices[0].label, "Plat");
        assert_eq!(view.equalizer_preset_choices[1].label, "Bass +");
    }

    #[test]
    fn crossfade_id_inverts_the_remembered_crossfade_state() {
        assert_eq!(map_settings_id(ID_CROSSFADE, &settings(false, 5, 3)), Some(DockSettingAction::SetCrossfade { enabled: true }));
        assert_eq!(map_settings_id(ID_CROSSFADE, &settings(true, 5, 3)), Some(DockSettingAction::SetCrossfade { enabled: false }));
    }

    #[test]
    fn maps_numbered_ids_within_range() {
        let s = DockMenuSettings::default();
        assert_eq!(map_settings_id(&crossfade_duration_id(1), &s), Some(DockSettingAction::SetCrossfadeDuration { seconds: 1 }));
        assert_eq!(map_settings_id(&crossfade_duration_id(12), &s), Some(DockSettingAction::SetCrossfadeDuration { seconds: 12 }));
        assert_eq!(map_settings_id(&parallel_id(1), &s), Some(DockSettingAction::SetMaxConcurrentDownloads { count: 1 }));
        assert_eq!(map_settings_id(&parallel_id(10), &s), Some(DockSettingAction::SetMaxConcurrentDownloads { count: 10 }));
    }

    #[test]
    fn rejects_out_of_range_numbered_ids() {
        let s = DockMenuSettings::default();
        assert_eq!(map_settings_id("dock:crossfade-duration:0", &s), None);
        assert_eq!(map_settings_id("dock:crossfade-duration:13", &s), None);
        assert_eq!(map_settings_id("dock:parallel:0", &s), None);
        assert_eq!(map_settings_id("dock:parallel:11", &s), None);
        assert_eq!(map_settings_id("dock:parallel:300", &s), None);
    }

    #[test]
    fn rejects_malformed_and_submenu_ids() {
        let s = DockMenuSettings::default();
        for id in [
            "dock:crossfade-duration:",
            "dock:crossfade-duration:abc",
            "dock:parallel:-1",
            "dock:parallel:3x",
            ID_CROSSFADE_DURATION_MENU,
            ID_PARALLEL_MENU,
            ID_EQUALIZER_PRESET_MENU,
            ID_SETTINGS_MENU,
            ID_TOGGLE,
            "crossfade",
        ] {
            assert_eq!(map_settings_id(id, &s), None, "id {id} should be rejected");
        }
    }

    #[test]
    fn transport_mapping_ignores_settings_ids() {
        assert_eq!(map_menu_id(ID_CROSSFADE), None);
        assert_eq!(map_menu_id(&parallel_id(2)), None);
    }

    #[test]
    fn view_checks_exactly_the_current_settings_values() {
        let mut s = state(None, false, false);
        s.settings = settings(true, 7, 1);
        let view = DockMenuView::from_state(&s);
        assert!(view.crossfade_checked);
        assert_eq!(view.crossfade_duration_choices.len(), 12);
        assert_eq!(view.parallel_choices.len(), 10);
        let checked_durations: Vec<_> = view.crossfade_duration_choices.iter().filter(|c| c.checked).map(|c| c.id.as_str()).collect();
        assert_eq!(checked_durations, vec!["dock:crossfade-duration:7"]);
        let checked_parallel: Vec<_> = view.parallel_choices.iter().filter(|c| c.checked).map(|c| c.id.as_str()).collect();
        assert_eq!(checked_parallel, vec!["dock:parallel:1"]);
    }

    #[test]
    fn view_labels_sequential_and_numbers_for_parallel_choices() {
        let view = DockMenuView::from_state(&DockMenuState::default());
        let labels: Vec<_> = view.parallel_choices.iter().map(|c| c.label.as_str()).collect();
        assert_eq!(labels, vec!["Sequential", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
        assert_eq!(view.settings_label, "Settings");
        assert_eq!(view.crossfade_label, "Crossfade");
        assert_eq!(view.crossfade_duration_label, "Crossfade duration");
        assert_eq!(view.parallel_label, "Parallel downloads");
    }

    #[test]
    fn view_uses_translated_seconds_and_falls_back_when_missing() {
        let mut s = DockMenuState::default();
        s.labels.crossfade_seconds = vec!["1 s".into(), "2 s".into()];
        let view = DockMenuView::from_state(&s);
        assert_eq!(view.crossfade_duration_choices[0].label, "1 s");
        assert_eq!(view.crossfade_duration_choices[1].label, "2 s");
        assert_eq!(view.crossfade_duration_choices[11].label, "12s");
    }

    #[test]
    fn current_view_reflects_the_last_remembered_state() {
        let mut remembered = state(Some("X — Y"), false, false);
        remembered.settings = settings(true, 9, 4);
        remember_state(remembered);
        let view = current_view();
        assert_eq!(view.title, "X — Y");
        assert_eq!(view.toggle_label, "Play");
        assert!(view.crossfade_checked);
        assert_eq!(current_settings(), settings(true, 9, 4));
    }
}
