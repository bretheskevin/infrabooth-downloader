use reqwest::Url;

use crate::models::artist::{ArtistProfile, ArtistTracksResponse};
use crate::services::http::{validate_api_response, RequestBuilderExt, API_V2_BASE, HTTP_CLIENT, SC_APP_VERSION};
use crate::services::playlist::{RawTrackInfo, TrackInfo};

pub async fn fetch_artist_profile(
    client_id: &str,
    token: &str,
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
        .with_oauth(Some(token))
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

pub async fn fetch_artist_tracks(
    client_id: &str,
    token: &str,
    datadome: Option<&str>,
    artist_id: u64,
    limit: u64,
    offset: u64,
) -> Result<ArtistTracksResponse, String> {
    let limit_str = limit.to_string();
    let offset_str = offset.to_string();

    let url = Url::parse_with_params(
        &format!("{}/users/{}/toptracks", API_V2_BASE, artist_id),
        &[
            ("client_id", client_id),
            ("limit", &limit_str),
            ("offset", &offset_str),
            ("linked_partitioning", "1"),
            ("app_version", SC_APP_VERSION),
            ("app_locale", "en"),
        ],
    )
    .map_err(|e| format!("Failed to build URL: {}", e))?;

    log::info!("[artist] Fetching tracks for user {}, offset={}", artist_id, offset);

    let mut request = HTTP_CLIENT.get(url).with_oauth(Some(token));

    if let Some(dd) = datadome {
        request = request.header("x-datadome-clientid", dd);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch artist tracks: {}", e))?;

    log::debug!("[artist] Response status: {}", response.status());

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
    let track_count = tracks.len() as u64;

    log::info!("[artist] Fetched {} tracks, has_more={}", track_count, api_response.next_href.is_some());

    Ok(ArtistTracksResponse {
        tracks,
        has_more: api_response.next_href.is_some(),
        next_offset: offset + track_count,
    })
}

#[derive(serde::Deserialize)]
struct ApiTracksResponse {
    collection: Vec<RawTrackInfo>,
    next_href: Option<String>,
}
