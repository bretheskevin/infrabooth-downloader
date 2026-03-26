use tauri::Manager;

use crate::commands::require_auth_and_cid;
use crate::services::new_tracks::{
    self, ActivityItem, FollowedArtist, NewTracksCache, SeenArtistsState,
};

pub fn seen_state_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("seen_artists.json")
}

#[tauri::command]
#[specta::specta]
pub async fn get_followed_artists(app: tauri::AppHandle, force_refresh: bool) -> Result<Vec<FollowedArtist>, String> {
    log::info!("[new-tracks] get_followed_artists called (force_refresh={})", force_refresh);
    let cache = app.state::<NewTracksCache>();
    if force_refresh {
        cache.clear();
    }
    if let Some(cached) = cache.get_artists() {
        log::info!("[new-tracks] Returning {} cached artists", cached.len());
        return Ok(cached);
    }

    let (token, client_id) = require_auth_and_cid(&app).await?;
    log::info!("[new-tracks] Fetching followed artists and stream concurrently...");
    let seen = app.state::<SeenArtistsState>();

    let (raw_result, stream_result) = tokio::join!(
        new_tracks::fetch_all_followed_artists(&token, &client_id),
        new_tracks::fetch_stream(&token),
    );

    let raw_artists = raw_result.map_err(|e| {
        log::error!("[new-tracks] Failed to fetch followed artists: {}", e);
        e.to_string()
    })?;
    log::info!("[new-tracks] Fetched {} raw followed artists", raw_artists.len());

    let activity_map = stream_result.map_err(|e| {
        log::error!("[new-tracks] Failed to fetch stream: {}", e);
        e.to_string()
    })?;
    log::info!("[new-tracks] Fetched stream activity for {} artists", activity_map.len());

    let mut artists: Vec<FollowedArtist> = raw_artists
        .into_iter()
        .filter_map(|raw| {
            let items = activity_map.get(&raw.id)?;
            if items.is_empty() {
                return None;
            }

            let last_seen = seen.get(raw.id).unwrap_or(0);
            let has_new_content = items.iter().any(|item| {
                new_tracks::parse_iso_timestamp(&item.created_at)
                    .map(|ts| ts > last_seen)
                    .unwrap_or(false)
            });

            Some(FollowedArtist {
                id: raw.id,
                username: raw.username,
                avatar_url: raw.avatar_url,
                has_new_content,
            })
        })
        .collect();

    let seen_times: std::collections::HashMap<u64, i64> = artists
        .iter()
        .filter_map(|a| seen.get(a.id).map(|ts| (a.id, ts)))
        .collect();

    artists.sort_by(|a, b| {
        match b.has_new_content.cmp(&a.has_new_content) {
            std::cmp::Ordering::Equal => {
                let a_seen = seen_times.get(&a.id).copied().unwrap_or(0);
                let b_seen = seen_times.get(&b.id).copied().unwrap_or(0);
                if a.has_new_content {
                    a_seen.cmp(&b_seen)
                } else {
                    b_seen.cmp(&a_seen)
                }
            }
            other => other,
        }
    });

    log::info!("[new-tracks] Returning {} artists (filtered from stream)", artists.len());
    cache.set_artists(artists.clone());

    for (artist_id, items) in &activity_map {
        cache.set_activity(*artist_id, items.clone());
    }

    Ok(artists)
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_activity(
    app: tauri::AppHandle,
    artist_id: u64,
) -> Result<Vec<ActivityItem>, String> {
    let cache = app.state::<NewTracksCache>();
    if let Some(cached) = cache.get_activity(artist_id) {
        return Ok(cached);
    }

    let (token, _client_id) = require_auth_and_cid(&app).await?;
    let stream_map = new_tracks::fetch_stream(&token)
        .await
        .map_err(|e| e.to_string())?;

    let items = stream_map.get(&artist_id).cloned().unwrap_or_default();
    cache.set_activity(artist_id, items.clone());
    Ok(items)
}

#[tauri::command]
#[specta::specta]
pub async fn mark_artist_seen(app: tauri::AppHandle, artist_id: u64) -> Result<(), String> {
    let now = new_tracks::now_unix();

    let path = seen_state_path(&app);
    let json = {
        let seen = app.state::<SeenArtistsState>();
        seen.mark_seen(artist_id, now);
        app.state::<NewTracksCache>().update_artist_seen(artist_id);
        seen.to_json()?
    };

    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    tokio::fs::write(&path, json)
        .await
        .map_err(|e| format!("Failed to write seen state: {}", e))?;
    Ok(())
}
