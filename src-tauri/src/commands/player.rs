use tauri::State;

use crate::models::error::ErrorResponse;
use crate::services::player::messages::{DockMenuState, EngineMsg, PlayerMediaMetadata, PlayerPreloadTrack};
use crate::services::player::PlayerHandle;
use crate::services::storage::AuthState;
use crate::services::stream;

/// Resolve a track ID to an HLS playback URL.
///
/// Calls SoundCloud's `/tracks/{urn}/streams` endpoint (with fallback to
/// the legacy transcodings approach) and returns a signed HLS playlist URL
/// ready for the frontend audio element.
#[tauri::command]
#[specta::specta]
pub async fn resolve_playback_url(track_id: u64, track_url: String, auth_state: State<'_, AuthState>) -> Result<String, ErrorResponse> {
    let oauth_token = auth_state.get_token();
    stream::resolve_playback_url(track_id, &track_url, oauth_token.as_deref()).await.map_err(|e| e.into())
}

fn dispatch(player: &PlayerHandle, name: &str, msg: EngineMsg) -> Result<(), ErrorResponse> {
    log::debug!("[player::cmd] {} received", name);
    player.send(msg).map_err(|e| {
        log::error!("[player::cmd] {} failed: {}", name, e);
        e.into()
    })
}

#[tauri::command]
#[specta::specta]
pub fn player_load(url: String, start_position_ms: u64, load_generation: u32, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    log::info!("[player::cmd] player_load gen={} start={}ms", load_generation, start_position_ms);
    dispatch(&player, "player_load", EngineMsg::Load { url, start_ms: start_position_ms, generation: load_generation })
}

#[tauri::command]
#[specta::specta]
pub fn player_play(player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_play", EngineMsg::Play)
}

#[tauri::command]
#[specta::specta]
pub fn player_pause(player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_pause", EngineMsg::Pause)
}

#[tauri::command]
#[specta::specta]
pub fn player_seek(position_ms: u64, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_seek", EngineMsg::Seek { position_ms })
}

#[tauri::command]
#[specta::specta]
pub fn player_set_volume(volume: f64, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_set_volume", EngineMsg::SetVolume { volume: volume as f32 })
}

#[tauri::command]
#[specta::specta]
pub fn player_stop(load_generation: u32, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    log::info!("[player::cmd] player_stop gen={}", load_generation);
    dispatch(&player, "player_stop", EngineMsg::Stop { generation: load_generation })
}

#[tauri::command]
#[specta::specta]
pub fn player_destroy(load_generation: u32, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    log::info!("[player::cmd] player_destroy gen={}", load_generation);
    dispatch(&player, "player_destroy", EngineMsg::Destroy { generation: load_generation })
}

#[tauri::command]
#[specta::specta]
pub fn player_preload_next(url: String, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_preload_next", EngineMsg::PreloadNext { url })
}

#[tauri::command]
#[specta::specta]
pub fn player_start_crossfade(duration_ms: u64, target_volume: f64, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    log::info!("[player::cmd] player_start_crossfade duration={}ms target={:.2}", duration_ms, target_volume);
    dispatch(&player, "player_start_crossfade", EngineMsg::StartCrossfade { duration_ms, target_volume: target_volume as f32 })
}

#[tauri::command]
#[specta::specta]
pub fn player_cancel_crossfade(player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_cancel_crossfade", EngineMsg::CancelCrossfade)
}

#[tauri::command]
#[specta::specta]
pub fn player_settle_crossfade(player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_settle_crossfade", EngineMsg::SettleCrossfade)
}

#[tauri::command]
#[specta::specta]
pub fn player_preload_segments(tracks: Vec<PlayerPreloadTrack>, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    log::debug!("[player::cmd] player_preload_segments count={}", tracks.len());
    dispatch(&player, "player_preload_segments", EngineMsg::PreloadSegments { tracks })
}

#[tauri::command]
#[specta::specta]
pub fn player_purge_cache(keep_track_ids: Vec<u64>, player: State<'_, PlayerHandle>) -> Result<(), ErrorResponse> {
    dispatch(&player, "player_purge_cache", EngineMsg::PurgeCache { keep_track_ids })
}

#[tauri::command]
#[specta::specta]
pub fn player_set_media_metadata(metadata: Option<PlayerMediaMetadata>, app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    log::debug!("[player::cmd] player_set_media_metadata present={}", metadata.is_some());
    crate::services::player::media_controls::set_metadata(&app, metadata);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn player_set_dock_state(state: DockMenuState, app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    log::debug!("[player::cmd] player_set_dock_state has_track={}", state.has_track);
    crate::services::player::dock_menu::set_state(&app, state);
    Ok(())
}
