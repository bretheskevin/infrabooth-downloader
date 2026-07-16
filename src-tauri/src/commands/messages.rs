use tauri::Manager;

use crate::commands::{require_auth_and_cid, require_user_id};
use crate::services::messages::{self, ConversationsPage, MessageEmbed, MessagesCache, MessagesPage, CONVERSATIONS_TTL};
use crate::services::storage::AuthState;
use crate::services::webview_send;

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
    webview_send::retry_if_antibot(&app, &token, "send-message", result, || {
        Ok(messages::send_message_webview_request(&client_id, user_id, other_user_id, &content))
    })
    .await?;

    cache.clear();

    Ok(())
}
