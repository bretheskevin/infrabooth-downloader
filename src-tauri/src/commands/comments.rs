use crate::commands::require_auth_and_cid;
use crate::services::comments::{self, CommentsPage};

const COMMENTS_LIMIT: u32 = 20;

#[tauri::command]
#[specta::specta]
pub async fn get_track_comments(app: tauri::AppHandle, track_id: u64, offset: Option<u32>) -> Result<CommentsPage, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    comments::fetch_track_comments(&token, &client_id, track_id, COMMENTS_LIMIT, offset.unwrap_or(0)).await.map_err(|e| e.to_string())
}
