use rquest::Url;

use once_cell::sync::Lazy;

use crate::models::artist::{ArtistProfile, ResolvedLink, SortOption};
use crate::services::http::{build_sc_paginated_url, fetch_all_pages, resolve_sc_url, validate_api_response, RequestBuilderExt, API_V2_BASE, DEFAULT_PAGE_SIZE, HTTP_CLIENT};
use crate::services::playlist::TrackInfo;

pub async fn fetch_artist_profile(
    client_id: &str,
    token: Option<&str>,
    artist_id: u64,
) -> Result<ArtistProfile, String> {
    let url = Url::parse_with_params(
        &format!("{}/users/{}", API_V2_BASE, artist_id),
        &[("client_id", client_id)],
    )
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

    log::info!("[artist] Profile loaded: id={}, username={}, track_count={}", profile.id, profile.username, profile.track_count);

    Ok(profile)
}

pub async fn fetch_all_artist_tracks<F>(
    client_id: &str,
    token: Option<&str>,
    datadome: Option<&str>,
    artist_id: u64,
    sort: &SortOption,
    on_batch: F,
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
        |raw: crate::services::playlist::RawTrackInfo| TrackInfo::from(raw),
        on_batch,
    )
    .await
}

pub async fn resolve_user(
    client_id: &str,
    token: Option<&str>,
    permalink: &str,
) -> Result<ArtistProfile, String> {
    if permalink.is_empty()
        || permalink.contains('/')
        || permalink.contains('?')
        || permalink.contains('#')
    {
        return Err("Invalid permalink".to_string());
    }

    let sc_url = format!("https://soundcloud.com/{}", permalink);

    log::debug!("[artist] Resolving user permalink: {}", permalink);

    resolve_sc_url::<ArtistProfile>(&sc_url, client_id, token)
        .await
        .map_err(|e| e.to_string())
}

pub async fn resolve_soundcloud_link(
    client_id: &str,
    token: Option<&str>,
    url: &str,
) -> Result<ResolvedLink, String> {
    static NO_REDIRECT_CLIENT: Lazy<rquest::Client> = Lazy::new(|| {
        rquest::Client::builder()
            .redirect(rquest::redirect::Policy::none())
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("Failed to create no-redirect HTTP client")
    });

    let parsed = Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;
    let canonical_url = if parsed.host_str() == Some("on.soundcloud.com") {
        let response = NO_REDIRECT_CLIENT
            .head(url)
            .send()
            .await
            .map_err(|e| format!("Failed to resolve short link: {}", e))?;

        let location = response
            .headers()
            .get("location")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        log::debug!("[artist] Short link {} resolved to: {:?}", url, location);

        match location {
            Some(loc) => loc.split('?').next().unwrap_or(&loc).to_string(),
            None => return Err("Short link did not redirect".to_string()),
        }
    } else {
        url.to_string()
    };

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
