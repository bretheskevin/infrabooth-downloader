use tauri::Manager;

use crate::commands::{get_optional_auth_and_cid, require_auth_and_cid};
use crate::services::comments::{self, CommentsPage, TrackComment};
use crate::services::storage::AuthState;
use crate::services::webview_send;

const COMMENTS_LIMIT: u32 = 20;

#[tauri::command]
#[specta::specta]
pub async fn get_track_comments(app: tauri::AppHandle, track_id: u64, offset: Option<u32>) -> Result<CommentsPage, String> {
    let (token, client_id) = get_optional_auth_and_cid(&app).await?;
    comments::fetch_track_comments(token.as_deref(), &client_id, track_id, COMMENTS_LIMIT, offset.unwrap_or(0)).await.map_err(|e| e.to_string())
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

    match result {
        Err(e) if webview_send::is_antibot(&e) => {
            let req = comments::post_comment_webview_request(&client_id, track_id, &body, timestamp, reply_to_permalink.as_deref());
            let response_body = webview_send::send_via_webview(&app, &token, "post-comment", req).await?;
            match response_body {
                Some(json) if !json.is_empty() => comments::parse_posted_comment(&json),
                _ => Ok(comments::synthesize_posted_comment(&body, timestamp, state.get_user_id().unwrap_or(0))),
            }
        }
        other => other.map_err(|e| e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn delete_comment(app: tauri::AppHandle, track_id: u64, comment_id: u64) -> Result<(), String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;

    let result = comments::delete_comment(&token, &client_id, track_id, comment_id).await;
    webview_send::retry_if_antibot(&app, &token, "delete-comment", result, || Ok(comments::delete_comment_webview_request(&client_id, comment_id))).await
}
