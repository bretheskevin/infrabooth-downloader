use tauri::Manager;

use crate::commands::{require_auth_and_cid, require_user_id};
use crate::models::error::ScApiError;
use crate::services::cookie::scan_browser_cookies;
use crate::services::http::ANTIBOT_BLOCKED;
use crate::services::messages::{self, ConversationsPage, MessageEmbed, MessagesCache, MessagesPage, CONVERSATIONS_TTL};
use crate::services::storage::AuthState;

fn is_antibot(err: &ScApiError) -> bool {
    matches!(err, ScApiError::FetchFailed(msg) if msg == ANTIBOT_BLOCKED)
}

/// Re-read the datadome cookie from the browser. The browser (logged in and actively
/// used) tends to hold a warmer, more-trusted cookie than the app's cached one, which
/// can pass a DataDome challenge that the stale cached cookie failed.
async fn refresh_browser_datadome() -> Option<String> {
    tokio::task::spawn_blocking(|| scan_browser_cookies().datadome).await.ok().flatten()
}

#[tauri::command]
#[specta::specta]
pub async fn get_conversations_page(app: tauri::AppHandle, offset: Option<u32>) -> Result<ConversationsPage, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    let user_id = require_user_id(&app)?;
    let cache = app.state::<MessagesCache>();

    if offset.is_none() {
        if let Some(cached) = cache.get_first_conversations_page(CONVERSATIONS_TTL) {
            return Ok(cached);
        }
    }

    let page = messages::fetch_conversations_page(&token, &client_id, user_id, offset, 10).await.map_err(|e| e.to_string())?;

    if offset.is_none() {
        cache.set_first_conversations_page(page.clone());
    }

    Ok(page)
}

#[tauri::command]
#[specta::specta]
pub async fn get_conversation_messages(app: tauri::AppHandle, other_user_id: u64, offset: Option<u32>) -> Result<MessagesPage, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    let user_id = require_user_id(&app)?;

    let page = messages::fetch_conversation_messages(&token, &client_id, user_id, other_user_id, offset, 10).await.map_err(|e| e.to_string())?;

    Ok(page)
}

#[tauri::command]
#[specta::specta]
pub async fn get_unread_conversations_flag(app: tauri::AppHandle) -> Result<bool, String> {
    let cache = app.state::<MessagesCache>();

    if let Some(cached) = cache.get_unread() {
        return Ok(cached);
    }

    let (token, client_id) = require_auth_and_cid(&app).await?;
    let user_id = require_user_id(&app)?;

    let page = messages::fetch_conversations_page(&token, &client_id, user_id, None, 5).await.map_err(|e| e.to_string())?;

    let has_unread = page.items.iter().any(|c| !c.read);
    cache.set_unread(has_unread);
    Ok(has_unread)
}

#[tauri::command]
#[specta::specta]
pub async fn resolve_message_embed(app: tauri::AppHandle, url: String) -> Result<Option<MessageEmbed>, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    let cache = app.state::<MessagesCache>();
    Ok(messages::resolve_embed_cached(&cache, &url, &client_id, &token).await)
}

#[tauri::command]
#[specta::specta]
pub async fn mark_conversation_read(app: tauri::AppHandle, other_user_id: u64) -> Result<(), String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    let user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let cache = app.state::<MessagesCache>();

    let (new_datadome, result) = messages::mark_conversation_read(&token, &client_id, datadome.as_deref(), user_id, other_user_id).await;
    state.update_datadome(new_datadome);
    result.map_err(|e| e.to_string())?;

    cache.clear();

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn send_message(app: tauri::AppHandle, other_user_id: u64, content: String) -> Result<(), String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    let user_id = require_user_id(&app)?;
    let state = app.state::<AuthState>();
    let datadome = state.get_datadome();
    let cache = app.state::<MessagesCache>();

    let (new_datadome, result) = messages::send_message(&token, &client_id, datadome.as_deref(), user_id, other_user_id, &content).await;
    state.update_datadome(new_datadome);

    let result = match result {
        Err(e) if is_antibot(&e) => match refresh_browser_datadome().await {
            Some(fresh) if datadome.as_deref() != Some(fresh.as_str()) => {
                state.set_datadome(Some(fresh.clone()));
                let (retry_datadome, retry_result) = messages::send_message(&token, &client_id, Some(&fresh), user_id, other_user_id, &content).await;
                state.update_datadome(retry_datadome);
                retry_result
            }
            _ => Err(e),
        },
        other => other,
    };

    result.map_err(|e| e.to_string())?;

    cache.clear();

    Ok(())
}
