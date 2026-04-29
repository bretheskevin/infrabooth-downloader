use rquest::Url;

use crate::models::error::FollowError;
use crate::services::http::{check_api_success, try_none, RequestBuilderExt, API_V2_BASE, CHROME_USER_AGENT, HTTP_CLIENT, SC_APP_VERSION};

/// Extracted from SoundCloud's JS bundle — may need periodic updating (like SC_APP_VERSION).
const FOLLOWS_SIGNATURE_SECRET: &str = "5Dpr3ubBw8LFtbvQcd4Hx6hU";
const FOLLOWS_SIGNATURE_VERSION: &str = "1";
const HASH_SEED: u32 = 7_996_111;

fn follow_signature(current_user_id: u64, target_user_id: u64, client_id: &str) -> String {
    let ua_parts: Vec<&str> = CHROME_USER_AGENT.split(&[' ', '/'][..]).collect();
    let token_idx = ua_parts[0].len() % ua_parts.len();
    let ua_token = ua_parts[token_idx];

    let input = format!(
        "{}{}{}{}{}{}{}",
        FOLLOWS_SIGNATURE_VERSION, FOLLOWS_SIGNATURE_SECRET, client_id, FOLLOWS_SIGNATURE_SECRET, target_user_id, current_user_id, ua_token,
    );

    let bytes = input.as_bytes();
    let mut hash: u32 = HASH_SEED;
    for &b in bytes {
        hash = (hash >> 1) + ((hash & 1) << 23);
        hash += b as u32;
        hash &= 0xFF_FFFF;
    }

    format!("{}:{:x}", FOLLOWS_SIGNATURE_VERSION, hash)
}

fn base_follow_url(target_user_id: u64, client_id: &str) -> Result<Url, FollowError> {
    Url::parse_with_params(
        &format!("{}/me/followings/{}", API_V2_BASE, target_user_id),
        &[("client_id", client_id), ("app_version", SC_APP_VERSION), ("app_locale", "en")],
    )
    .map_err(|e| FollowError::NetworkError(format!("Failed to build URL: {}", e)))
}

fn signed_follow_url(current_user_id: u64, target_user_id: u64, client_id: &str) -> Result<Url, FollowError> {
    let signature = follow_signature(current_user_id, target_user_id, client_id);
    let mut url = base_follow_url(target_user_id, client_id)?;
    url.query_pairs_mut().append_pair("signature", &signature);
    Ok(url)
}

pub async fn follow_user(
    oauth_token: &str, client_id: &str, datadome: Option<&str>, current_user_id: u64, target_user_id: u64,
) -> (Option<String>, Result<(), FollowError>) {
    log::info!("[follow] Following user {}", target_user_id);
    let url = try_none!(signed_follow_url(current_user_id, target_user_id, client_id));
    let response = try_none!(HTTP_CLIENT.post(url).with_oauth(Some(oauth_token)).with_datadome(datadome).header("Content-Length", "0").send().await);
    check_api_success(response, target_user_id, "followed", "follow", FollowError::ApiError).await
}

pub async fn unfollow_user(
    oauth_token: &str, client_id: &str, datadome: Option<&str>, current_user_id: u64, target_user_id: u64,
) -> (Option<String>, Result<(), FollowError>) {
    log::info!("[follow] Unfollowing user {}", target_user_id);
    let url = try_none!(signed_follow_url(current_user_id, target_user_id, client_id));
    let response = try_none!(HTTP_CLIENT.delete(url).with_oauth(Some(oauth_token)).with_datadome(datadome).send().await);
    check_api_success(response, target_user_id, "unfollowed", "follow", FollowError::ApiError).await
}

pub async fn check_follow_status(
    oauth_token: &str, client_id: &str, datadome: Option<&str>, current_user_id: u64, target_user_id: u64,
) -> Result<bool, FollowError> {
    log::debug!("[follow] Checking follow status for user {}", target_user_id);

    let url = Url::parse_with_params(&format!("{}/users/{}/followings/ids", API_V2_BASE, current_user_id), &[("client_id", client_id), ("limit", "5000")])
        .map_err(|e| FollowError::NetworkError(format!("Failed to build URL: {}", e)))?;

    let response = HTTP_CLIENT.get(url).with_oauth(Some(oauth_token)).with_datadome(datadome).send().await?;

    if !response.status().is_success() {
        let code = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        log::warn!("[follow] Check follow status returned HTTP {} - {}", code, body);
        return Err(FollowError::ApiError(code, body));
    }

    #[derive(serde::Deserialize)]
    struct FollowingIdsResponse {
        collection: Vec<u64>,
    }

    let data: FollowingIdsResponse = response.json().await.map_err(|e| FollowError::NetworkError(format!("Failed to parse followings: {}", e)))?;

    let is_following = data.collection.contains(&target_user_id);
    log::debug!(
        "[follow] User {} is{}followed",
        target_user_id,
        if is_following {
            " "
        } else {
            " NOT "
        }
    );
    Ok(is_following)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_follow_signature_matches_soundcloud_js() {
        let sig = follow_signature(526801914, 47501738, "tkIWLs4MIowq7bCXP80TOwx6DnDa7UPc");
        assert_eq!(sig, "1:2a5afe");
    }
}
