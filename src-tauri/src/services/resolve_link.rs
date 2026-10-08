use serde::Serialize;

use crate::models::error::{ResolveLinkError, ScApiError};
use crate::models::url::{UrlType, ValidationResult};
use crate::services::http::{expand_short_link, sanitize_error_body};
use crate::services::playlist::{self, PlaylistInfo, TrackInfo};
use crate::services::url_validator::validate_url;

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ResolvedLink {
    Track { track: TrackInfo },
    Playlist { playlist: PlaylistInfo },
}

fn link_type(validation: ValidationResult) -> Result<Option<UrlType>, ResolveLinkError> {
    if validation.valid {
        return Ok(validation.url_type);
    }
    let message = validation.error.map(|e| e.message).unwrap_or_else(|| "Invalid SoundCloud link".to_string());
    Err(ResolveLinkError::Invalid(message))
}

async fn classify(url: &str) -> Result<(String, UrlType), ResolveLinkError> {
    if let Some(url_type) = link_type(validate_url(url))? {
        return Ok((url.to_string(), url_type));
    }
    log::info!("[resolve_link] expanding short link {url}");
    let expanded = expand_short_link(url).await.map_err(|e| {
        log::warn!("[resolve_link] short link expansion failed for {url}: {e}");
        ResolveLinkError::Fetch(e)
    })?;
    log::info!("[resolve_link] short link {url} expanded to {expanded}");
    match link_type(validate_url(&expanded))? {
        Some(url_type) => Ok((expanded, url_type)),
        None => Err(ResolveLinkError::Invalid("Unsupported SoundCloud link".to_string())),
    }
}

fn fetch_error(error: ScApiError) -> ResolveLinkError {
    log::error!("[resolve_link] SoundCloud fetch failed: {error:?}");
    ResolveLinkError::Fetch(sanitize_error_body(error.to_string()))
}

pub async fn resolve_link(url: &str, oauth_token: Option<&str>) -> Result<ResolvedLink, ResolveLinkError> {
    let (url, url_type) = classify(url.trim()).await?;
    log::info!("[resolve_link] {url} classified as {url_type:?} (signed in: {})", oauth_token.is_some());
    match url_type {
        UrlType::Track => playlist::fetch_track_info(&url, oauth_token).await.map(|track| ResolvedLink::Track { track }).map_err(fetch_error),
        UrlType::Playlist => playlist::fetch_playlist_info(&url, oauth_token).await.map(|playlist| ResolvedLink::Playlist { playlist }).map_err(fetch_error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::playlist::{test_track_info, UserInfo};

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    #[test]
    fn link_type_returns_the_validation_message_for_non_soundcloud_urls() {
        assert_eq!(link_type(validate_url("https://example.com/foo")), Err(ResolveLinkError::Invalid("Not a SoundCloud URL".to_string())));
    }

    #[test]
    fn link_type_rejects_profile_links() {
        assert_eq!(
            link_type(validate_url("https://soundcloud.com/someone")),
            Err(ResolveLinkError::Invalid("This is a profile, not a playlist or track".to_string()))
        );
    }

    #[test]
    fn link_type_keeps_track_and_playlist_types() {
        assert_eq!(link_type(validate_url("https://soundcloud.com/a/b")), Ok(Some(UrlType::Track)));
        assert_eq!(link_type(validate_url("https://soundcloud.com/a/sets/b")), Ok(Some(UrlType::Playlist)));
    }

    #[test]
    fn link_type_leaves_short_links_unclassified() {
        assert_eq!(link_type(validate_url("https://on.soundcloud.com/abc123")), Ok(None));
    }

    #[tokio::test]
    async fn resolve_link_rejects_invalid_urls_without_fetching() {
        let result = resolve_link("  https://example.com/x  ", None).await;
        assert_eq!(result.err(), Some(ResolveLinkError::Invalid("Not a SoundCloud URL".to_string())));
    }

    #[test]
    fn resolved_track_serializes_with_kind_tag() -> TestResult {
        let json = serde_json::to_value(ResolvedLink::Track { track: test_track_info() })?;
        assert_eq!(json["kind"], "track");
        assert_eq!(json["track"]["id"], 0);
        assert!(json.get("playlist").is_none());
        Ok(())
    }

    #[test]
    fn resolved_playlist_serializes_with_kind_tag() -> TestResult {
        let playlist = PlaylistInfo {
            id: 7,
            title: "Set".to_string(),
            user: UserInfo { id: 2, username: "owner".to_string(), avatar_url: None },
            artwork_url: None,
            track_count: 1,
            tracks: vec![test_track_info()],
            secret_token: Some("s-AbC12".to_string()),
        };
        let json = serde_json::to_value(ResolvedLink::Playlist { playlist })?;
        assert_eq!(json["kind"], "playlist");
        assert_eq!(json["playlist"]["title"], "Set");
        assert_eq!(json["playlist"]["track_count"], 1);
        assert_eq!(json["playlist"]["tracks"].as_array().map(Vec::len), Some(1));
        assert_eq!(json["playlist"]["secret_token"], "s-AbC12");
        Ok(())
    }
}
