use tauri::Manager;

use crate::commands::{require_auth_and_cid, require_user_id};
use crate::services::new_tracks::{
    self, ActivityItem, FollowedArtist, NewTracksCache, ReleaseActivityItem, SeenArtistsState,
};
use crate::services::paths::get_app_data_dir;

pub fn seen_state_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    get_app_data_dir(app)
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
    let user_id = require_user_id(&app)?;
    log::info!("[new-tracks] Fetching followed artists and stream concurrently...");
    let seen = app.state::<SeenArtistsState>();

    let (raw_result, stream_result) = tokio::join!(
        new_tracks::fetch_all_followed_artists(&token, &client_id, user_id),
        new_tracks::fetch_stream(&token),
    );

    let raw_artists = raw_result.map_err(|e| {
        log::error!("[new-tracks] Failed to fetch followed artists: {}", e);
        e.to_string()
    })?;
    log::info!("[new-tracks] Fetched {} raw followed artists", raw_artists.len());

    let stream_data = stream_result.map_err(|e| {
        log::error!("[new-tracks] Failed to fetch stream: {}", e);
        e.to_string()
    })?;
    log::info!("[new-tracks] Fetched stream: {} artists with tracks, {} with releases", stream_data.tracks.len(), stream_data.releases.len());

    let mut seen_times = std::collections::HashMap::<u64, i64>::new();
    let mut artists: Vec<FollowedArtist> = raw_artists
        .into_iter()
        .filter_map(|raw| {
            let track_items = stream_data.tracks.get(&raw.id);
            let release_items = stream_data.releases.get(&raw.id);

            let has_any = track_items.is_some_and(|i| !i.is_empty())
                || release_items.is_some_and(|i| !i.is_empty());
            if !has_any {
                return None;
            }

            let track_last_seen = seen.get_track_seen(raw.id).unwrap_or(0);
            let release_last_seen = seen.get_release_seen(raw.id).unwrap_or(0);

            let has_new_content = track_items.map_or(false, |items| {
                new_tracks::has_items_after(items, track_last_seen, |i| &i.created_at)
            });

            let has_original_tracks = track_items.map_or(false, |items| {
                items.iter().any(|item| item.activity_type == new_tracks::ActivityType::Track)
            });

            let has_new_releases = release_items.map_or(false, |items| {
                new_tracks::has_items_after(items, release_last_seen, |i| &i.created_at)
            });

            let has_original_releases = release_items.map_or(false, |items| {
                items.iter().any(|item| item.activity_type == new_tracks::ReleaseActivityType::New)
            });

            seen_times.insert(raw.id, track_last_seen.max(release_last_seen));

            Some(FollowedArtist {
                id: raw.id,
                username: raw.username,
                avatar_url: raw.avatar_url,
                has_new_content,
                has_original_tracks,
                has_new_releases,
                has_original_releases,
            })
        })
        .collect();


    artists.sort_by(|a, b| {
        let a_has_new = a.has_new_content || a.has_new_releases;
        let b_has_new = b.has_new_content || b.has_new_releases;
        match b_has_new.cmp(&a_has_new) {
            std::cmp::Ordering::Equal => {
                let a_seen = seen_times.get(&a.id).copied().unwrap_or(0);
                let b_seen = seen_times.get(&b.id).copied().unwrap_or(0);
                if a_has_new {
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

    cache_all_stream_data(&stream_data, &cache);

    Ok(artists)
}

fn cache_all_stream_data(data: &new_tracks::StreamData, cache: &NewTracksCache) {
    for (id, items) in &data.tracks {
        cache.set_activity(*id, items.clone());
    }
    for (id, items) in &data.releases {
        cache.set_releases(*id, items.clone());
    }
}

async fn get_cached_or_fetch_stream<T: Clone>(
    app: &tauri::AppHandle,
    get_cached: impl FnOnce(&NewTracksCache) -> Option<Vec<T>>,
    extract: impl FnOnce(&new_tracks::StreamData) -> Vec<T>,
) -> Result<Vec<T>, String> {
    let cache = app.state::<NewTracksCache>();
    if let Some(cached) = get_cached(&cache) {
        return Ok(cached);
    }
    let (token, _client_id) = require_auth_and_cid(app).await?;
    let stream_data = new_tracks::fetch_stream(&token).await.map_err(|e| e.to_string())?;
    cache_all_stream_data(&stream_data, &cache);
    Ok(extract(&stream_data))
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_activity(app: tauri::AppHandle, artist_id: u64) -> Result<Vec<ActivityItem>, String> {
    get_cached_or_fetch_stream(&app,
        |cache| cache.get_activity(artist_id),
        |data| data.tracks.get(&artist_id).cloned().unwrap_or_default(),
    ).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_artist_releases(app: tauri::AppHandle, artist_id: u64) -> Result<Vec<ReleaseActivityItem>, String> {
    get_cached_or_fetch_stream(&app,
        |cache| cache.get_releases(artist_id),
        |data| data.releases.get(&artist_id).cloned().unwrap_or_default(),
    ).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_release_tracks(
    app: tauri::AppHandle,
    release_id: u64,
) -> Result<Vec<crate::services::playlist::TrackInfo>, String> {
    let (token, _client_id) = require_auth_and_cid(&app).await?;
    crate::services::playlist::fetch_playlist_by_id(release_id, None, Some(&token), |_| {})
        .await
        .map_err(|e| e.to_string())
}

async fn persist_seen_state(
    app: &tauri::AppHandle,
    artist_id: u64,
    update: impl FnOnce(&SeenArtistsState, &NewTracksCache, u64, i64),
) -> Result<(), String> {
    let now = new_tracks::now_unix();
    let path = seen_state_path(app);
    let json = {
        let seen = app.state::<SeenArtistsState>();
        let cache = app.state::<NewTracksCache>();
        update(&seen, &cache, artist_id, now);
        seen.to_json()?
    };
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    tokio::fs::write(&path, json).await.map_err(|e| format!("Failed to write seen state: {}", e))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn mark_artist_seen(app: tauri::AppHandle, artist_id: u64) -> Result<(), String> {
    persist_seen_state(&app, artist_id, |seen, cache, id, now| {
        seen.mark_track_seen(id, now);
        cache.update_artist_seen(id);
    }).await
}

#[tauri::command]
#[specta::specta]
pub async fn mark_artist_releases_seen(app: tauri::AppHandle, artist_id: u64) -> Result<(), String> {
    persist_seen_state(&app, artist_id, |seen, cache, id, now| {
        seen.mark_release_seen(id, now);
        cache.update_artist_releases_seen(id);
    }).await
}
