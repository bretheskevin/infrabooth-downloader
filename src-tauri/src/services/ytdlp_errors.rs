use crate::models::error::YtDlpError;

struct PatternGroup {
    patterns: &'static [&'static str],
    message: &'static str,
}

struct ErrorMatcher {
    groups: &'static [PatternGroup],
    prerequisite: Option<&'static str>,
    to_error: fn(String) -> YtDlpError,
}

const GEO_BLOCK_MATCHER: ErrorMatcher = ErrorMatcher {
    groups: &[PatternGroup {
        patterns: &[
            "not available in your country",
            "geo restricted",
            "geo-restricted",
            "not available in your region",
            "blocked in your country",
            "not available in your location",
            "is not available for playback",
            "not available in this country",
        ],
        message: "Geographic restriction by rights holder",
    }],
    prerequisite: None,
    to_error: YtDlpError::GeoBlocked,
};

const AUTH_REQUIRED_MATCHER: ErrorMatcher = ErrorMatcher {
    groups: &[PatternGroup {
        patterns: &[
            "sign in",
            "login required",
            "authentication required",
            "age verification",
            "confirm your age",
            "age-restricted",
            "age restricted",
            "must be logged in",
        ],
        message: "Authentication or age verification required",
    }],
    prerequisite: None,
    to_error: YtDlpError::AuthRequired,
};

const NETWORK_ERROR_MATCHER: ErrorMatcher = ErrorMatcher {
    groups: &[
        PatternGroup {
            patterns: &["timed out", "timeout"],
            message: "Connection timed out",
        },
        PatternGroup {
            patterns: &["connection reset"],
            message: "Connection was reset",
        },
        PatternGroup {
            patterns: &["connection refused"],
            message: "Connection refused",
        },
        PatternGroup {
            patterns: &["no route to host", "network is unreachable"],
            message: "Network is unreachable",
        },
        PatternGroup {
            patterns: &["name or service not known", "could not resolve"],
            message: "DNS resolution failed",
        },
        PatternGroup {
            patterns: &[
                "ssl error",
                "ssl_error",
                "certificate verify failed",
                "certificate has expired",
            ],
            message: "SSL/TLS error",
        },
        PatternGroup {
            patterns: &["http error 5"],
            message: "Server error",
        },
    ],
    prerequisite: Some("error"),
    to_error: YtDlpError::NetworkError,
};

const CONVERSION_ERROR_MATCHER: ErrorMatcher = ErrorMatcher {
    groups: &[
        PatternGroup {
            patterns: &["invalid data found"],
            message: "Invalid or corrupted audio data",
        },
        PatternGroup {
            patterns: &["conversion failed"],
            message: "Audio conversion failed",
        },
        PatternGroup {
            patterns: &["encoder", "not found"],
            message: "Audio encoder not found",
        },
        PatternGroup {
            patterns: &["unsupported codec", "unknown codec"],
            message: "Unsupported audio format",
        },
        PatternGroup {
            patterns: &["no space left", "disk full"],
            message: "Disk is full",
        },
    ],
    prerequisite: None,
    to_error: YtDlpError::ConversionFailed,
};

const UNAVAILABILITY_MATCHER: ErrorMatcher = ErrorMatcher {
    groups: &[
        PatternGroup {
            patterns: &[
                "this track was removed",
                "has been removed",
                "was removed by",
                "been deleted",
            ],
            message: "Track was removed by the uploader",
        },
        PatternGroup {
            patterns: &["private video", "track is private", "is private", "private track"],
            message: "Track is private",
        },
        PatternGroup {
            patterns: &[
                "does not exist",
                "no longer available",
                "video unavailable",
                "this video is not available",
                "video is unavailable",
                "content is not available",
            ],
            message: "Track no longer exists",
        },
    ],
    prerequisite: None,
    to_error: YtDlpError::TrackUnavailable,
};

impl ErrorMatcher {
    fn matches(&self, stderr: &str) -> Option<YtDlpError> {
        let stderr_lower = stderr.to_lowercase();

        if let Some(prereq) = self.prerequisite {
            if !stderr_lower.contains(prereq) {
                return None;
            }
        }

        for group in self.groups {
            let matches = if group.patterns.len() == 2
                && group.message == "Audio encoder not found"
            {
                group.patterns.iter().all(|p| stderr_lower.contains(p))
            } else {
                group.patterns.iter().any(|p| stderr_lower.contains(p))
            };

            if matches {
                return Some((self.to_error)(group.message.to_string()));
            }
        }

        None
    }
}

pub fn classify_stderr_error(line: &str) -> Option<YtDlpError> {
    if let Some(err) = GEO_BLOCK_MATCHER.matches(line) {
        return Some(err);
    }
    if line.contains("HTTP Error 403") {
        return Some(YtDlpError::GeoBlocked("Access forbidden".to_string()));
    }
    if line.contains("HTTP Error 429") || line.contains("rate limit") {
        return Some(YtDlpError::RateLimited);
    }
    if let Some(err) = AUTH_REQUIRED_MATCHER.matches(line) {
        return Some(err);
    }
    if let Some(err) = NETWORK_ERROR_MATCHER.matches(line) {
        return Some(err);
    }
    if let Some(err) = CONVERSION_ERROR_MATCHER.matches(line) {
        return Some(err);
    }
    if let Some(err) = UNAVAILABILITY_MATCHER.matches(line) {
        return Some(err);
    }
    if line.contains("HTTP Error 404") {
        return Some(YtDlpError::TrackUnavailable(
            "Track not found (404)".to_string(),
        ));
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_geo_block_not_available_country() {
        let stderr = "ERROR: This track is not available in your country";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_geo_restricted() {
        let stderr = "ERROR: Video geo restricted";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_geo_restricted_hyphen() {
        let stderr = "ERROR: This content is geo-restricted";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_not_available_region() {
        let stderr = "ERROR: Content not available in your region";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_blocked_country() {
        let stderr = "This track is blocked in your country";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_not_available_location() {
        let stderr = "ERROR: This content is not available in your location";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_not_available_playback() {
        let stderr = "ERROR: Track is not available for playback";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_case_insensitive() {
        let stderr = "ERROR: This track is NOT AVAILABLE IN YOUR COUNTRY";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_geo_block_returns_message() {
        let stderr = "ERROR: This track is not available in your country";
        if let Some(YtDlpError::GeoBlocked(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Geographic restriction by rights holder");
        } else {
            panic!("Expected GeoBlocked error");
        }
    }

    #[test]
    fn test_detect_geo_block_no_match() {
        let stderr = "ERROR: Network timeout";
        assert!(!matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_video_unavailable() {
        let stderr = "ERROR: Video unavailable";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_this_video_not_available() {
        let stderr = "ERROR: This video is not available";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_private_video() {
        let stderr = "ERROR: Private video. Sign in if you've been granted access to this video";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::AuthRequired(_)) | Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_track_removed() {
        let stderr = "ERROR: This track was removed by the uploader";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_does_not_exist() {
        let stderr = "ERROR: This page does not exist";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_video_is_unavailable() {
        let stderr = "ERROR: Video is unavailable";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_content_not_available() {
        let stderr = "ERROR: Content is not available";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_has_been_removed() {
        let stderr = "ERROR: This content has been removed";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_no_longer_available() {
        let stderr = "ERROR: This track is no longer available";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_track_is_private() {
        let stderr = "ERROR: Track is private";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_is_private() {
        let stderr = "ERROR: This content is private";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_case_insensitive() {
        let stderr = "ERROR: VIDEO UNAVAILABLE";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }

    #[test]
    fn test_detect_unavailability_returns_message() {
        let stderr = "ERROR: Video unavailable";
        if let Some(YtDlpError::TrackUnavailable(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Track no longer exists");
        } else {
            panic!("Expected TrackUnavailable error");
        }
    }

    #[test]
    fn test_detect_unavailability_removed_returns_specific_message() {
        let stderr = "ERROR: This track was removed by the uploader";
        if let Some(YtDlpError::TrackUnavailable(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Track was removed by the uploader");
        } else {
            panic!("Expected TrackUnavailable error");
        }
    }

    #[test]
    fn test_detect_unavailability_private_returns_specific_message() {
        let stderr = "ERROR: Track is private";
        if let Some(YtDlpError::TrackUnavailable(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Track is private");
        } else {
            panic!("Expected TrackUnavailable error");
        }
    }

    #[test]
    fn test_detect_auth_required_sign_in() {
        let stderr = "ERROR: Sign in to confirm your age";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::AuthRequired(_))
        ));
    }

    #[test]
    fn test_detect_auth_required_age_verification() {
        let stderr = "ERROR: Age verification required";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::AuthRequired(_))
        ));
    }

    #[test]
    fn test_detect_auth_required_login() {
        let stderr = "ERROR: Login required to view this content";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::AuthRequired(_))
        ));
    }

    #[test]
    fn test_detect_network_error_timeout() {
        let stderr = "ERROR: Connection timed out";
        if let Some(YtDlpError::NetworkError(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Connection timed out");
        } else {
            panic!("Expected NetworkError");
        }
    }

    #[test]
    fn test_detect_network_error_connection_reset() {
        let stderr = "ERROR: Connection reset by peer";
        if let Some(YtDlpError::NetworkError(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Connection was reset");
        } else {
            panic!("Expected NetworkError");
        }
    }

    #[test]
    fn test_detect_network_error_dns() {
        let stderr = "ERROR: Name or service not known";
        if let Some(YtDlpError::NetworkError(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "DNS resolution failed");
        } else {
            panic!("Expected NetworkError");
        }
    }

    #[test]
    fn test_detect_network_error_ignores_debug_lines() {
        let stderr = "[debug] Python 3.14.2 (CPython arm64 64bit) - macOS (OpenSSL 3.0.18)";
        assert!(classify_stderr_error(stderr).is_none());
    }

    #[test]
    fn test_detect_network_error_ssl_error() {
        let stderr = "ERROR: SSL error: certificate verify failed";
        if let Some(YtDlpError::NetworkError(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "SSL/TLS error");
        } else {
            panic!("Expected NetworkError");
        }
    }

    #[test]
    fn test_detect_network_error_server_error() {
        let stderr = "ERROR: HTTP Error 503: Service Unavailable";
        if let Some(YtDlpError::NetworkError(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Server error");
        } else {
            panic!("Expected NetworkError");
        }
    }

    #[test]
    fn test_detect_conversion_error_invalid_data() {
        let stderr = "ERROR: Invalid data found when processing input";
        if let Some(YtDlpError::ConversionFailed(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Invalid or corrupted audio data");
        } else {
            panic!("Expected ConversionFailed");
        }
    }

    #[test]
    fn test_detect_conversion_error_conversion_failed() {
        let stderr = "ERROR: Conversion failed";
        if let Some(YtDlpError::ConversionFailed(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Audio conversion failed");
        } else {
            panic!("Expected ConversionFailed");
        }
    }

    #[test]
    fn test_detect_conversion_error_disk_full() {
        let stderr = "ERROR: No space left on device";
        if let Some(YtDlpError::ConversionFailed(msg)) = classify_stderr_error(stderr) {
            assert_eq!(msg, "Disk is full");
        } else {
            panic!("Expected ConversionFailed");
        }
    }

    #[test]
    fn test_http_403_returns_geo_blocked() {
        let stderr = "ERROR: HTTP Error 403: Forbidden";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::GeoBlocked(_))
        ));
    }

    #[test]
    fn test_http_429_returns_rate_limited() {
        let stderr = "ERROR: HTTP Error 429: Too Many Requests";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::RateLimited)
        ));
    }

    #[test]
    fn test_rate_limit_text_returns_rate_limited() {
        let stderr = "ERROR: rate limit exceeded";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::RateLimited)
        ));
    }

    #[test]
    fn test_http_404_returns_track_unavailable() {
        let stderr = "ERROR: HTTP Error 404: Not Found";
        assert!(matches!(
            classify_stderr_error(stderr),
            Some(YtDlpError::TrackUnavailable(_))
        ));
    }
}
