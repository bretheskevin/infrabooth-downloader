use tauri::Manager;

use crate::commands::require_auth_and_cid;
use crate::services::notifications::{
    self, LastSeenActivityState, NotificationsCache, NotificationsPage, UnreadCountResult, FIRST_PAGE_TTL, UNREAD_PROBE_TTL,
};
use crate::services::paths::get_app_data_dir;
use crate::services::timestamp::parse_iso_timestamp;

pub fn last_seen_activities_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    get_app_data_dir(app)
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("seen_activities.json")
}

#[tauri::command]
#[specta::specta]
pub async fn get_unread_count(app: tauri::AppHandle) -> Result<UnreadCountResult, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    let cache = app.state::<NotificationsCache>();
    let seen = app.state::<LastSeenActivityState>();

    let (latest_ts, was_fresh) = match cache.get_unread_probe(UNREAD_PROBE_TTL) {
        Some(ts) => (ts, false),
        None => {
            let page = notifications::fetch_activities_page(&token, &client_id, None, 1)
                .await
                .map_err(|e| e.to_string())?;
            let ts = page.items.first().and_then(|item| parse_iso_timestamp(item.created_at()));
            cache.set_unread_probe(ts);
            (ts, true)
        }
    };

    let last_seen = seen.get();
    let unread = notifications::has_unread(latest_ts, last_seen);

    if was_fresh && unread {
        cache.clear_first_page();
    }

    let latest_created_at = latest_ts.map(|ts| {
        time::OffsetDateTime::from_unix_timestamp(ts)
            .map(|dt| dt.format(&time::format_description::well_known::Rfc3339).unwrap_or_default())
            .unwrap_or_default()
    });

    Ok(UnreadCountResult { unread, latest_created_at })
}

#[tauri::command]
#[specta::specta]
pub async fn get_notifications_page(app: tauri::AppHandle, cursor: Option<String>) -> Result<NotificationsPage, String> {
    let (token, client_id) = require_auth_and_cid(&app).await?;
    let cache = app.state::<NotificationsCache>();

    if cursor.is_none() {
        if let Some(cached) = cache.get_first_page(FIRST_PAGE_TTL) {
            return Ok(cached);
        }
    }

    let page = notifications::fetch_activities_page(&token, &client_id, cursor.as_deref(), 10)
        .await
        .map_err(|e| e.to_string())?;

    if cursor.is_none() {
        cache.set_first_page(page.clone());
    }

    Ok(page)
}

#[tauri::command]
#[specta::specta]
pub async fn mark_notifications_seen(app: tauri::AppHandle, latest_created_at: String) -> Result<(), String> {
    let ts = parse_iso_timestamp(&latest_created_at).ok_or_else(|| format!("Invalid timestamp: {}", latest_created_at))?;

    let path = last_seen_activities_path(&app);
    let json = {
        let seen = app.state::<LastSeenActivityState>();
        let cache = app.state::<NotificationsCache>();
        seen.set(ts);
        cache.set_unread_probe(None);
        seen.to_json()?
    };

    super::persist_json(&path, json).await
}
