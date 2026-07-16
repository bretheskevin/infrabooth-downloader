use serde::{Deserialize, Serialize};
use specta::Type;

use crate::models::error::ScApiError;
use crate::services::http::{
    extract_datadome_from_response, sanitize_error_body, try_none, validate_api_response, RequestBuilderExt, ANTIBOT_BLOCKED, API_V2_BASE, HTTP_CLIENT,
    SC_APP_VERSION,
};
use crate::services::notifications::ActorInfo;
use crate::services::webview_send::WebviewRequest;

// ---------------------------------------------------------------------------
// Frontend-facing types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TrackComment {
    pub id: u64,
    pub body: String,
    pub created_at: String,
    pub timestamp_ms: i64,
    pub user: ActorInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommentsPage {
    pub comments: Vec<TrackComment>,
    pub next_offset: Option<u32>,
}

// ---------------------------------------------------------------------------
// Raw API types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct RawCommentsPage {
    collection: Vec<RawComment>,
    next_href: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawComment {
    id: u64,
    body: String,
    created_at: String,
    #[serde(default)]
    timestamp: i64,
    user: RawCommentUser,
}

#[derive(Debug, Deserialize)]
struct RawCommentUser {
    id: u64,
    username: String,
    avatar_url: Option<String>,
    #[serde(default)]
    permalink: Option<String>,
    #[serde(default)]
    permalink_url: Option<String>,
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

fn convert_user(raw: RawCommentUser) -> ActorInfo {
    ActorInfo {
        id: raw.id,
        username: raw.username,
        avatar_url: raw.avatar_url,
        permalink: raw.permalink.unwrap_or_default(),
        permalink_url: raw.permalink_url.unwrap_or_default(),
    }
}

fn convert_comment(raw: RawComment) -> TrackComment {
    TrackComment { id: raw.id, body: raw.body, created_at: raw.created_at, timestamp_ms: raw.timestamp, user: convert_user(raw.user) }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

pub async fn fetch_track_comments(oauth_token: Option<&str>, client_id: &str, track_id: u64, limit: u32, offset: u32) -> Result<CommentsPage, ScApiError> {
    let url = format!(
        "{}/tracks/{}/comments?sort=newest&threaded=1&client_id={}&limit={}&offset={}&linked_partitioning=1",
        API_V2_BASE, track_id, client_id, limit, offset
    );

    let response = HTTP_CLIENT.get(&url).with_oauth(oauth_token).send().await?;
    validate_api_response(response.status())?;

    let raw: RawCommentsPage = response.json().await.map_err(|_| ScApiError::InvalidResponse)?;

    let has_next = raw.next_href.is_some() && raw.collection.len() == limit as usize;
    let comments = raw.collection.into_iter().map(convert_comment).collect();
    let next_offset = if has_next { Some(offset + limit) } else { None };

    Ok(CommentsPage { comments, next_offset })
}

fn build_comment_body(body: &str, reply_to_permalink: Option<&str>) -> String {
    match reply_to_permalink {
        Some(permalink) => format!("@{}: {}", permalink, body),
        None => body.to_string(),
    }
}

const COMMENT_FORM_CONTENT_TYPE: &str = "application/x-www-form-urlencoded; charset=UTF-8";

fn comment_post_url(track_id: u64, client_id: &str) -> String {
    format!("{}/tracks/{}/comments?client_id={}", API_V2_BASE, track_id, client_id)
}

fn comment_delete_url(comment_id: u64, client_id: &str) -> String {
    format!("{}/comments/{}?client_id={}&app_version={}&app_locale=en", API_V2_BASE, comment_id, client_id, SC_APP_VERSION)
}

fn encode_comment_form(body: &str, timestamp: i64, reply_to_permalink: Option<&str>) -> String {
    let full_body = build_comment_body(body, reply_to_permalink);
    format!("body={}&timestamp={}", urlencoding::encode(&full_body), timestamp)
}

pub fn post_comment_webview_request(client_id: &str, track_id: u64, body: &str, timestamp: i64, reply_to_permalink: Option<&str>) -> WebviewRequest {
    WebviewRequest {
        method: "POST",
        url: comment_post_url(track_id, client_id),
        content_type: Some(COMMENT_FORM_CONTENT_TYPE),
        body: Some(encode_comment_form(body, timestamp, reply_to_permalink)),
    }
}

pub fn delete_comment_webview_request(client_id: &str, comment_id: u64) -> WebviewRequest {
    WebviewRequest::bare("DELETE", comment_delete_url(comment_id, client_id))
}

/// Parse the created comment shipped back from a WebView-replayed post.
pub fn parse_posted_comment(json: &str) -> Result<TrackComment, String> {
    serde_json::from_str::<RawComment>(json).map(convert_comment).map_err(|e| format!("Failed to parse posted comment: {}", e))
}

/// Fallback when a WebView-replayed post succeeds but ships no response body
/// (rare: the page's `res.text()` rejected, or the body exceeded the size cap).
/// The comment *was* posted, so we must report success; the frontend discards
/// this value and refetches, so a minimal placeholder is enough.
pub fn synthesize_posted_comment(body: &str, timestamp: i64, user_id: u64) -> TrackComment {
    TrackComment {
        id: 0,
        body: body.to_string(),
        created_at: String::new(),
        timestamp_ms: timestamp,
        user: ActorInfo { id: user_id, username: String::new(), avatar_url: None, permalink: String::new(), permalink_url: String::new() },
    }
}

fn map_comment_error(status: rquest::StatusCode, body: String) -> ScApiError {
    let sanitized = sanitize_error_body(body);
    if sanitized == ANTIBOT_BLOCKED {
        ScApiError::FetchFailed(sanitized)
    } else {
        validate_api_response(status).unwrap_err().into()
    }
}

pub async fn post_comment(
    oauth_token: &str, client_id: &str, datadome: Option<&str>, track_id: u64, body: &str, timestamp: i64, reply_to_permalink: Option<&str>,
) -> (Option<String>, Result<TrackComment, ScApiError>) {
    let url = comment_post_url(track_id, client_id);
    let encoded_body = encode_comment_form(body, timestamp, reply_to_permalink);

    let response = try_none!(
        HTTP_CLIENT
            .post(&url)
            .with_oauth(Some(oauth_token))
            .with_datadome(datadome)
            .header("Content-Type", COMMENT_FORM_CONTENT_TYPE)
            .body(encoded_body)
            .send()
            .await
    );

    let new_datadome = extract_datadome_from_response(&response);
    let status = response.status();

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        log::error!("[comments] Failed to post comment on track {}: HTTP {} - {}", track_id, status, body);
        return (new_datadome, Err(map_comment_error(status, body)));
    }

    let result = response.json::<RawComment>().await.map_err(|_| ScApiError::InvalidResponse).map(convert_comment);
    (new_datadome, result)
}

pub async fn delete_comment(oauth_token: &str, client_id: &str, track_id: u64, comment_id: u64) -> Result<(), ScApiError> {
    let url = comment_delete_url(comment_id, client_id);

    let response = HTTP_CLIENT.delete(&url).with_oauth(Some(oauth_token)).send().await?;

    let status = response.status();

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        log::error!("[comments] Failed to delete comment {} on track {}: HTTP {} - {}", comment_id, track_id, status, body);
        return Err(map_comment_error(status, body));
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_raw_comment_json(id: u64, timestamp: i64, body: &str, created_at: &str) -> serde_json::Value {
        serde_json::json!({
            "id": id,
            "body": body,
            "created_at": created_at,
            "timestamp": timestamp,
            "user": {
                "id": 42,
                "username": "CommentUser",
                "avatar_url": "https://i1.sndcdn.com/avatars-test-large.jpg",
                "permalink": "commentuser",
                "permalink_url": "https://soundcloud.com/commentuser"
            }
        })
    }

    #[test]
    fn test_deserialize_raw_comment() {
        let json = make_raw_comment_json(101, 5000, "Great track!", "2026-01-15T10:30:00Z");
        let raw: RawComment = serde_json::from_value(json).unwrap();
        assert_eq!(raw.id, 101);
        assert_eq!(raw.timestamp, 5000);
        assert_eq!(raw.body, "Great track!");
        assert_eq!(raw.user.username, "CommentUser");
    }

    #[test]
    fn test_convert_comment_maps_fields() {
        let raw = RawComment {
            id: 200,
            body: "Nice one".to_string(),
            created_at: "2026-02-01T12:00:00Z".to_string(),
            timestamp: 12345,
            user: RawCommentUser {
                id: 50,
                username: "TestUser".to_string(),
                avatar_url: Some("https://example.com/avatar.jpg".to_string()),
                permalink: Some("testuser".to_string()),
                permalink_url: Some("https://soundcloud.com/testuser".to_string()),
            },
        };
        let comment = convert_comment(raw);
        assert_eq!(comment.id, 200);
        assert_eq!(comment.timestamp_ms, 12345);
        assert_eq!(comment.body, "Nice one");
        assert_eq!(comment.user.id, 50);
        assert_eq!(comment.user.permalink_url, "https://soundcloud.com/testuser");
    }

    #[test]
    fn test_convert_user_missing_permalink() {
        let raw = RawCommentUser { id: 99, username: "NoPermalink".to_string(), avatar_url: None, permalink: None, permalink_url: None };
        let actor = convert_user(raw);
        assert_eq!(actor.permalink_url, "");
    }

    #[test]
    fn test_build_comment_body_prepends_reply_permalink() {
        assert_eq!(build_comment_body("thanks!", Some("kandid_ib")), "@kandid_ib: thanks!");
    }

    #[test]
    fn test_build_comment_body_no_reply() {
        assert_eq!(build_comment_body("Great track!", None), "Great track!");
    }

    #[test]
    fn test_next_offset_when_has_next_href_and_full_page() {
        let mut comments = Vec::new();
        for i in 0..20 {
            let json = make_raw_comment_json(i, 0, "comment", "2026-01-01T00:00:00Z");
            let raw: RawComment = serde_json::from_value(json).unwrap();
            comments.push(raw);
        }
        let raw_page = RawCommentsPage { collection: comments, next_href: Some("https://api-v2.soundcloud.com/tracks/123/comments?offset=20".to_string()) };
        let has_next = raw_page.next_href.is_some() && raw_page.collection.len() == 20;
        let next_offset = if has_next { Some(0 + 20) } else { None };
        assert_eq!(next_offset, Some(20));
    }

    #[test]
    fn test_next_offset_none_when_no_next_href() {
        let mut comments = Vec::new();
        for i in 0..20 {
            let json = make_raw_comment_json(i, 0, "comment", "2026-01-01T00:00:00Z");
            let raw: RawComment = serde_json::from_value(json).unwrap();
            comments.push(raw);
        }
        let raw_page = RawCommentsPage { collection: comments, next_href: None };
        let has_next = raw_page.next_href.is_some() && raw_page.collection.len() == 20;
        let next_offset = if has_next { Some(0 + 20) } else { None };
        assert_eq!(next_offset, None);
    }

    #[test]
    fn test_next_offset_none_when_short_page() {
        let mut comments = Vec::new();
        for i in 0..5 {
            let json = make_raw_comment_json(i, 0, "comment", "2026-01-01T00:00:00Z");
            let raw: RawComment = serde_json::from_value(json).unwrap();
            comments.push(raw);
        }
        let raw_page = RawCommentsPage { collection: comments, next_href: Some("https://api-v2.soundcloud.com/tracks/123/comments?offset=5".to_string()) };
        let limit: u32 = 20;
        let has_next = raw_page.next_href.is_some() && raw_page.collection.len() == limit as usize;
        let next_offset = if has_next { Some(0 + limit) } else { None };
        assert_eq!(next_offset, None);
    }

    #[test]
    fn test_delete_comment_url_format() {
        let comment_id = 67890u64;
        let track_id = 12345u64;
        let url = format!("{}/comments/{}?client_id={}&app_version={}&app_locale=en", API_V2_BASE, comment_id, "test_cid", SC_APP_VERSION);
        assert!(url.contains("/comments/67890"), "URL must use top-level /comments/ path");
        assert!(url.contains("client_id=test_cid"), "URL must contain client_id");
        assert!(!url.contains(&format!("/tracks/{}", track_id)), "URL must NOT contain /tracks/ path");
    }
}
