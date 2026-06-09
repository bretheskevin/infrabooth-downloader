use tauri::Manager;

use crate::commands::require_auth_and_cid;
use crate::services::comments::{self, CommentsPage, TrackComment};
use crate::services::storage::AuthState;

const COMMENTS_LIMIT: u32 = 20;

#[tauri::command]
#[specta::specta]
pub async fn get_track_comments(app: tauri::AppHandle, track_id: u64, offset: Option<u32>) -> Result<CommentsPage, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    comments::fetch_track_comments(&token, &client_id, track_id, COMMENTS_LIMIT, offset.unwrap_or(0)).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn post_comment(
    app: tauri::AppHandle, track_id: u64, body: String, timestamp: i64, reply_to_permalink: Option<String>,
) -> Result<TrackComment, String> {
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let (new_datadome, result) =
        comments::post_comment(&token, &client_id, datadome.as_deref(), track_id, &body, timestamp, reply_to_permalink.as_deref()).await;
    state.update_datadome(new_datadome);
    result.map_err(|e| e.to_string())
}
