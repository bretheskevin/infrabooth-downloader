use tauri::State;

use crate::models::error::ErrorResponse;
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
