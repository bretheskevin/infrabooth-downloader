use crate::models::error::ErrorResponse;
use crate::services::http::HTTP_CLIENT;
use crate::services::playlist::TrackInfo;
use crate::services::related;

#[tauri::command]
#[specta::specta]
pub async fn fetch_related_tracks(
    track_id: i64,
    limit: u16,
    app: tauri::AppHandle,
) -> Result<Vec<TrackInfo>, ErrorResponse> {
    let (token, client_id) = super::require_auth_and_cid(&app)
        .await
        .map_err(|e| ErrorResponse {
            code: "AUTH_REQUIRED".to_string(),
            message: e,
        })?;

    related::fetch_related_tracks(&HTTP_CLIENT, track_id, &client_id, Some(&token), limit)
        .await
        .map_err(ErrorResponse::from)
}
