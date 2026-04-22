use rquest::Url;

use crate::models::error::LikeTrackError;
use crate::services::http::{check_api_success, try_none, RequestBuilderExt, API_V2_BASE, HTTP_CLIENT, SC_APP_VERSION};

fn track_like_url(current_user_id: u64, track_id: u64, client_id: &str) -> Result<Url, LikeTrackError> {
    Url::parse_with_params(
        &format!("{}/users/{}/track_likes/{}", API_V2_BASE, current_user_id, track_id),
        &[("client_id", client_id), ("app_version", SC_APP_VERSION), ("app_locale", "en")],
    )
    .map_err(|e| LikeTrackError::NetworkError(format!("Failed to build URL: {}", e)))
}

pub async fn like_track(
    oauth_token: &str, client_id: &str, datadome: Option<&str>, current_user_id: u64, track_id: u64,
) -> (Option<String>, Result<(), LikeTrackError>) {
    log::info!("[like] Liking track {}", track_id);
    let url = try_none!(track_like_url(current_user_id, track_id, client_id));
    let response = try_none!(
        HTTP_CLIENT
            .put(url)
            .with_oauth(Some(oauth_token))
            .with_datadome(datadome)
            .header("Content-Length", "0")
            .send()
            .await
    );
    check_api_success(response, track_id, "liked", "like", LikeTrackError::ApiError).await
}

pub async fn unlike_track(
    oauth_token: &str, client_id: &str, datadome: Option<&str>, current_user_id: u64, track_id: u64,
) -> (Option<String>, Result<(), LikeTrackError>) {
    log::info!("[like] Unliking track {}", track_id);
    let url = try_none!(track_like_url(current_user_id, track_id, client_id));
    let response = try_none!(
        HTTP_CLIENT
            .delete(url)
            .with_oauth(Some(oauth_token))
            .with_datadome(datadome)
            .send()
            .await
    );
    check_api_success(response, track_id, "unliked", "like", LikeTrackError::ApiError).await
}
