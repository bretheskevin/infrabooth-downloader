use crate::models::url::{UrlType, ValidationError, ValidationResult};
use url::Url;

const SOUNDCLOUD_HOSTS: [&str; 2] = ["soundcloud.com", "www.soundcloud.com"];

pub fn validate_url(input: &str) -> ValidationResult {
    // Check if input is empty
    if input.trim().is_empty() {
        return ValidationResult {
            valid: false,
            url_type: None,
            error: Some(ValidationError {
                code: "INVALID_URL".to_string(),
                message: "Invalid URL format".to_string(),
                hint: None,
            }),
        };
    }

    // Parse URL
    let url = match Url::parse(input) {
        Ok(u) => u,
        Err(_) => {
            // Try adding https:// prefix
            match Url::parse(&format!("https://{}", input)) {
                Ok(u) => u,
                Err(_) => return invalid_format_error(),
            }
        }
    };

    // Check if SoundCloud domain
    let host = url.host_str().unwrap_or("");
    if !SOUNDCLOUD_HOSTS.contains(&host) {
        return ValidationResult {
            valid: false,
            url_type: None,
            error: Some(ValidationError {
                code: "INVALID_URL".to_string(),
                message: "Not a SoundCloud URL".to_string(),
                hint: Some("Paste a link from soundcloud.com".to_string()),
            }),
        };
    }

    // Parse path segments
    let path = url.path();
    let segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

    match segments.as_slice() {
        // Private playlist: /user/sets/playlist-name/s-secrettoken
        [_user, "sets", _playlist, secret] if secret.starts_with("s-") => ValidationResult {
            valid: true,
            url_type: Some(UrlType::Playlist),
            error: None,
        },
        // Regular playlist: /user/sets/playlist-name
        [_user, "sets", _playlist] => ValidationResult {
            valid: true,
            url_type: Some(UrlType::Playlist),
            error: None,
        },
        // Private track: /user/track-name/s-secrettoken
        [_user, track, secret] if *track != "sets" && secret.starts_with("s-") => ValidationResult {
            valid: true,
            url_type: Some(UrlType::Track),
            error: None,
        },
        // Regular track: /user/track-name (2 segments, not "sets")
        [_user, track] if *track != "sets" => ValidationResult {
            valid: true,
            url_type: Some(UrlType::Track),
            error: None,
        },
        // Profile: /user (1 segment only)
        [_user] => ValidationResult {
            valid: false,
            url_type: None,
            error: Some(ValidationError {
                code: "INVALID_URL".to_string(),
                message: "This is a profile, not a playlist or track".to_string(),
                hint: Some("Try pasting a playlist or track link".to_string()),
            }),
        },
        // Other patterns
        _ => invalid_format_error(),
    }
}

fn invalid_format_error() -> ValidationResult {
    ValidationResult {
        valid: false,
        url_type: None,
        error: Some(ValidationError {
            code: "INVALID_URL".to_string(),
            message: "Invalid URL format".to_string(),
            hint: None,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_playlist_url() {
        let result = validate_url("https://soundcloud.com/user/sets/my-playlist");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Playlist));
        assert!(result.error.is_none());
    }

    #[test]
    fn test_valid_playlist_url_with_www() {
        let result = validate_url("https://www.soundcloud.com/user/sets/my-playlist");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Playlist));
    }

    #[test]
    fn test_valid_track_url() {
        let result = validate_url("https://soundcloud.com/artist/track-name");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Track));
        assert!(result.error.is_none());
    }

    #[test]
    fn test_valid_track_url_without_protocol() {
        let result = validate_url("soundcloud.com/artist/track-name");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Track));
    }

    #[test]
    fn test_profile_url_rejected() {
        let result = validate_url("https://soundcloud.com/user");
        assert!(!result.valid);
        assert!(result.url_type.is_none());
        let error = result.error.unwrap();
        assert!(error.message.contains("profile"));
        assert!(error.hint.is_some());
        assert!(error.hint.unwrap().contains("playlist or track"));
    }

    #[test]
    fn test_non_soundcloud_url() {
        let result = validate_url("https://spotify.com/track/123");
        assert!(!result.valid);
        assert!(result.url_type.is_none());
        let error = result.error.unwrap();
        assert!(error.message.contains("Not a SoundCloud"));
        assert!(error.hint.is_some());
    }

    #[test]
    fn test_empty_input() {
        let result = validate_url("");
        assert!(!result.valid);
        assert!(result.url_type.is_none());
        let error = result.error.unwrap();
        assert_eq!(error.code, "INVALID_URL");
        assert!(error.message.contains("Invalid URL format"));
    }

    #[test]
    fn test_whitespace_only_input() {
        let result = validate_url("   ");
        assert!(!result.valid);
        assert!(result.error.is_some());
    }

    #[test]
    fn test_malformed_url() {
        let result = validate_url("not-a-valid-url");
        assert!(!result.valid);
        let error = result.error.unwrap();
        assert_eq!(error.code, "INVALID_URL");
    }

    #[test]
    fn test_url_with_query_params() {
        let result = validate_url("https://soundcloud.com/artist/track?ref=clipboard");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Track));
    }

    #[test]
    fn test_playlist_with_trailing_slash() {
        let result = validate_url("https://soundcloud.com/user/sets/playlist/");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Playlist));
    }

    #[test]
    fn test_discover_page_rejected() {
        let result = validate_url("https://soundcloud.com/discover");
        assert!(!result.valid);
        let error = result.error.unwrap();
        assert!(error.message.contains("profile"));
    }

    #[test]
    fn test_sets_without_playlist_name_rejected() {
        let result = validate_url("https://soundcloud.com/user/sets");
        assert!(!result.valid);
    }

    #[test]
    fn test_private_playlist_url() {
        let result = validate_url(
            "https://soundcloud.com/kandid_rl/sets/set-acidcore-4/s-rW47Pe4rQWc",
        );
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Playlist));
    }

    #[test]
    fn test_private_playlist_url_with_query_params() {
        let result = validate_url(
            "https://soundcloud.com/user/sets/playlist/s-abc123?si=xyz&utm_source=clipboard",
        );
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Playlist));
    }

    #[test]
    fn test_private_track_url() {
        let result = validate_url("https://soundcloud.com/artist/track-name/s-secrettoken");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Track));
    }

    #[test]
    fn test_private_track_url_with_query_params() {
        let result = validate_url("https://soundcloud.com/artist/track/s-abc123?ref=clipboard");
        assert!(result.valid);
        assert_eq!(result.url_type, Some(UrlType::Track));
    }
}
