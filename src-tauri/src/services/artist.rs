use rquest::Url;

use crate::models::artist::{ArtistProfile, ResolvedLink, SortOption};
use crate::services::http::{
    build_sc_paginated_url, expand_short_link, fetch_all_pages, resolve_sc_url, validate_api_response, RequestBuilderExt, API_V2_BASE,
    DEFAULT_PAGE_SIZE, HTTP_CLIENT,
};
use crate::services::playlist::TrackInfo;

pub async fn fetch_artist_profile(client_id: &str, token: Option<&str>, artist_id: u64) -> Result<ArtistProfile, String> {
    let url = Url::parse_with_params(&format!("{}/users/{}", API_V2_BASE, artist_id), &[("client_id", client_id)])
        .map_err(|e| format!("Failed to build URL: {}", e))?;

    log::info!("[artist] Fetching profile for user {}", artist_id);

    let response = HTTP_CLIENT
        .get(url)
        .with_oauth(token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch artist profile: {}", e))?;

    log::debug!("[artist] Profile response status: {}", response.status());

    validate_api_response(response.status()).map_err(|e| e.to_string())?;

    let profile: ArtistProfile = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse artist profile: {}", e))?;

    log::info!(
        "[artist] Profile loaded: id={}, username={}, track_count={}",
        profile.id,
        profile.username,
        profile.track_count
    );

    Ok(profile)
}

pub async fn fetch_all_artist_tracks<F>(
    client_id: &str, token: Option<&str>, datadome: Option<&str>, artist_id: u64, sort: &SortOption, on_batch: F,
) -> Result<Vec<TrackInfo>, String>
where
    F: Fn(&[TrackInfo]),
{
    let base_url = match sort {
        SortOption::Recent => format!("{}/users/{}/tracks", API_V2_BASE, artist_id),
        SortOption::Popular => format!("{}/users/{}/toptracks", API_V2_BASE, artist_id),
    };

    let initial_url = build_sc_paginated_url(&base_url, client_id)?;

    fetch_all_pages(
        initial_url.to_string(),
        token,
        datadome,
        &format!("artist_tracks:user_{}:{:?}", artist_id, sort),
        DEFAULT_PAGE_SIZE,
        |raw: crate::services::playlist::RawTrackInfo| Some(TrackInfo::from(raw)),
        on_batch,
    )
    .await
}

#[derive(serde::Deserialize)]
struct UserLikeItem {
    track: Option<crate::services::playlist::RawTrackInfo>,
}

pub async fn fetch_all_artist_likes<F>(
    client_id: &str, token: Option<&str>, datadome: Option<&str>, artist_id: u64, on_batch: F,
) -> Result<Vec<TrackInfo>, String>
where
    F: Fn(&[TrackInfo]),
{
    let initial_url = build_sc_paginated_url(&format!("{}/users/{}/likes", API_V2_BASE, artist_id), client_id)?;

    fetch_all_pages(
        initial_url.to_string(),
        token,
        datadome,
        &format!("artist_likes:user_{}", artist_id),
        DEFAULT_PAGE_SIZE,
        |raw: UserLikeItem| raw.track.map(TrackInfo::from),
        on_batch,
    )
    .await
}

pub async fn resolve_user(client_id: &str, token: Option<&str>, permalink: &str) -> Result<ArtistProfile, String> {
    if permalink.is_empty() || permalink.contains('/') || permalink.contains('?') || permalink.contains('#') {
        return Err("Invalid permalink".to_string());
    }

    let sc_url = format!("https://soundcloud.com/{}", permalink);

    log::debug!("[artist] Resolving user permalink: {}", permalink);

    resolve_sc_url::<ArtistProfile>(&sc_url, client_id, token)
        .await
        .map_err(|e| e.to_string())
}

pub async fn resolve_soundcloud_link(client_id: &str, token: Option<&str>, url: &str) -> Result<ResolvedLink, String> {
    let canonical_url = expand_short_link(url).await?;

    log::debug!("[artist] Resolving canonical URL: {}", canonical_url);

    let value = resolve_sc_url::<serde_json::Value>(&canonical_url, client_id, token)
        .await
        .map_err(|e| e.to_string())?;

    let kind = value.get("kind").and_then(|v| v.as_str()).unwrap_or("unknown");
    log::debug!("[artist] Resolved link kind: {}", kind);

    let (user_id, username) = match kind {
        "user" => (
            value.get("id").and_then(|v| v.as_u64()),
            value.get("username").and_then(|v| v.as_str()).map(|s| s.to_string()),
        ),
        "track" | "playlist" => {
            let user = value.get("user");
            (
                user.and_then(|u| u.get("id")).and_then(|v| v.as_u64()),
                user.and_then(|u| u.get("username")).and_then(|v| v.as_str()).map(|s| s.to_string()),
            )
        }
        _ => (None, None),
    };

    Ok(ResolvedLink { kind: kind.to_string(), user_id, username })
}
