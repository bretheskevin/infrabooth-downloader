use rquest::Url;

use crate::models::error::FollowError;
use crate::services::http::{RequestBuilderExt, API_V2_BASE, HTTP_CLIENT, SC_APP_VERSION};

fn follow_url(user_id: u64, client_id: &str) -> Result<Url, FollowError> {
    Url::parse_with_params(
        &format!("{}/me/followings/{}", API_V2_BASE, user_id),
        &[
            ("client_id", client_id),
            ("app_version", SC_APP_VERSION),
            ("app_locale", "en"),
        ],
    )
    .map_err(|e| FollowError::NetworkError(format!("Failed to build URL: {}", e)))
}

async fn check_api_success(response: rquest::Response, user_id: u64, action: &str) -> Result<(), FollowError> {
    if response.status().is_success() {
        log::info!("[follow] Successfully {} user {}", action, user_id);
        Ok(())
    } else {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        log::error!("[follow] Failed to {} user {}: HTTP {} - {}", action, user_id, status, body);
        Err(FollowError::ApiError(status, body))
    }
}

pub async fn follow_user(
    oauth_token: &str,
    client_id: &str,
    datadome: Option<&str>,
    user_id: u64,
) -> Result<(), FollowError> {
    log::info!("[follow] Following user {}", user_id);

    let response = HTTP_CLIENT
        .post(follow_url(user_id, client_id)?)
        .with_oauth(Some(oauth_token))
        .with_datadome(datadome)
        .header("Content-Length", "0")
        .send()
        .await?;

    check_api_success(response, user_id, "followed").await
}

pub async fn unfollow_user(
    oauth_token: &str,
    client_id: &str,
    datadome: Option<&str>,
    user_id: u64,
) -> Result<(), FollowError> {
    log::info!("[follow] Unfollowing user {}", user_id);

    let response = HTTP_CLIENT
        .delete(follow_url(user_id, client_id)?)
        .with_oauth(Some(oauth_token))
        .with_datadome(datadome)
        .send()
        .await?;

    check_api_success(response, user_id, "unfollowed").await
}

pub async fn check_follow_status(
    oauth_token: &str,
    client_id: &str,
    datadome: Option<&str>,
    user_id: u64,
) -> Result<bool, FollowError> {
    log::debug!("[follow] Checking follow status for user {}", user_id);

    let response = HTTP_CLIENT
        .get(follow_url(user_id, client_id)?)
        .with_oauth(Some(oauth_token))
        .with_datadome(datadome)
        .send()
        .await?;

    let status = response.status();
    if status.is_success() {
        Ok(true)
    } else if status == rquest::StatusCode::NOT_FOUND {
        Ok(false)
    } else {
        let code = status.as_u16();
        let body = response.text().await.unwrap_or_default();
        Err(FollowError::ApiError(code, body))
    }
}
