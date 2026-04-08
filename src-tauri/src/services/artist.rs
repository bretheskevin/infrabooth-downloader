use rquest::Url;

use crate::models::artist::ArtistProfile;
use crate::services::http::{resolve_sc_url, validate_api_response, RequestBuilderExt, API_V2_BASE, HTTP_CLIENT, SC_APP_VERSION};
use crate::services::playlist::{RawTrackInfo, TrackInfo};

const PAGE_SIZE: usize = 20;
const PAGE_SIZE_STR: &str = "20";

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
    on_batch: F,
) -> Result<Vec<TrackInfo>, String>
where
    F: Fn(&[TrackInfo]),
{
    let initial_url = Url::parse_with_params(
        &format!("{}/users/{}/toptracks", API_V2_BASE, artist_id),
        &[
            ("client_id", client_id),
            ("limit", PAGE_SIZE_STR),
            ("linked_partitioning", "1"),
            ("app_version", SC_APP_VERSION),
            ("app_locale", "en"),
        ],
    )
    .map_err(|e| format!("Failed to build URL: {}", e))?;

    let mut all_tracks = Vec::new();
    let mut next_url: Option<String> = Some(initial_url.to_string());

    while let Some(url) = next_url.take() {
        log::info!("[artist] Fetching tracks for user {}, page {}", artist_id, (all_tracks.len() / PAGE_SIZE) + 1);

        let response = HTTP_CLIENT.get(&url)
            .with_oauth(token)
            .with_datadome(datadome)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch artist tracks: {}", e))?;

        validate_api_response(response.status()).map_err(|e| e.to_string())?;

        let body = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        let api_response: ApiTracksResponse = serde_json::from_str(&body)
            .map_err(|e| {
                let preview = body.get(..200).unwrap_or(&body);
                log::error!("[artist] Parse error: {} — body preview: {}", e, preview);
                format!("Failed to parse artist tracks: {}", e)
            })?;

        let tracks: Vec<TrackInfo> = api_response.collection.into_iter().map(TrackInfo::from).collect();

        log::info!("[artist] Fetched {} tracks, has_more={}", tracks.len(), api_response.next_href.is_some());

        if !tracks.is_empty() {
            on_batch(&tracks);
            all_tracks.extend(tracks);
        }

        next_url = api_response.next_href;
    }

    log::info!("[artist] Completed: {} total tracks for user {}", all_tracks.len(), artist_id);

    Ok(all_tracks)
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

#[derive(serde::Deserialize)]
struct ApiTracksResponse {
    collection: Vec<RawTrackInfo>,
    next_href: Option<String>,
}
