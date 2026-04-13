use rquest::{Client, Url};
use serde::Deserialize;

use crate::models::error::DownloadError;
use crate::services::http::{validate_sc_response, RequestBuilderExt, API_V2_BASE};
use crate::services::playlist::{RawTrackInfo, TrackInfo};

#[derive(Debug, Deserialize)]
struct RelatedTracksResponse {
    collection: Vec<RawTrackInfo>,
}

pub async fn fetch_related_tracks(
    client: &Client, track_id: i64, client_id: &str, oauth_token: Option<&str>, limit: u16,
) -> Result<Vec<TrackInfo>, DownloadError> {
    let url = Url::parse_with_params(
        &format!("{}/tracks/{}/related", API_V2_BASE, track_id),
        &[("client_id", client_id), ("limit", &limit.to_string()), ("linked_partitioning", "1")],
    )
    .map_err(|e| DownloadError::StreamResolutionFailed(e.to_string()))?;

    let response = client
        .get(url)
        .with_oauth(oauth_token)
        .send()
        .await
        .map_err(|e| DownloadError::NetworkError(e.to_string()))?;

    let response = validate_sc_response(response, None).await?;

    let body: RelatedTracksResponse = response
        .json()
        .await
        .map_err(|e| DownloadError::StreamResolutionFailed(format!("Failed to parse related tracks: {}", e)))?;

    Ok(body.collection.into_iter().map(TrackInfo::from).collect())
}
