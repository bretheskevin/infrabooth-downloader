use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

pub trait HasErrorCode {
    fn code(&self) -> &'static str;
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
}

impl<T: HasErrorCode + std::fmt::Display> From<T> for ErrorResponse {
    fn from(err: T) -> Self {
        ErrorResponse { code: err.code().to_string(), message: err.to_string() }
    }
}

#[derive(Debug, Error, Serialize)]
pub enum FfmpegError {
    #[error("FFmpeg binary not found")]
    BinaryNotFound,
}

impl HasErrorCode for FfmpegError {
    fn code(&self) -> &'static str {
        match self {
            FfmpegError::BinaryNotFound => "BINARY_NOT_FOUND",
        }
    }
}

#[derive(Debug, Error)]
pub enum MetadataError {
    #[error("Failed to write metadata: {0}")]
    WriteFailed(String),

    #[error("Failed to download artwork: {0}")]
    ArtworkFailed(String),
}

impl HasErrorCode for MetadataError {
    fn code(&self) -> &'static str {
        match self {
            MetadataError::WriteFailed(_) => "METADATA_WRITE_FAILED",
            MetadataError::ArtworkFailed(_) => "ARTWORK_DOWNLOAD_FAILED",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitInfo {
    pub remaining_requests: Option<u32>,
    pub reset_time: Option<String>,
    pub max_nr_of_requests: Option<u32>,
    pub time_window: Option<String>,
}

#[derive(Debug, Error)]
pub enum ScApiError {
    #[error("Authentication required")]
    AuthRequired,

    #[error("Rate limited by SoundCloud")]
    RateLimited,

    #[error("Not found")]
    NotFound,

    #[error("Access forbidden")]
    GeoBlocked,

    #[error("{0}")]
    FetchFailed(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] rquest::Error),

    #[error("Invalid response")]
    InvalidResponse,
}

impl HasErrorCode for ScApiError {
    fn code(&self) -> &'static str {
        match self {
            ScApiError::AuthRequired => "AUTH_REQUIRED",
            ScApiError::RateLimited => "RATE_LIMITED",
            ScApiError::NotFound => "NOT_FOUND",
            ScApiError::GeoBlocked => "GEO_BLOCKED",
            ScApiError::FetchFailed(_) => "FETCH_FAILED",
            ScApiError::NetworkError(_) => "NETWORK_ERROR",
            ScApiError::InvalidResponse => "INVALID_RESPONSE",
        }
    }
}

impl From<crate::services::http::ApiResponseError> for ScApiError {
    fn from(e: crate::services::http::ApiResponseError) -> Self {
        use crate::services::http::ApiResponseError;
        match e {
            ApiResponseError::AuthRequired => Self::AuthRequired,
            ApiResponseError::RateLimited => Self::RateLimited,
            ApiResponseError::NotFound => Self::NotFound,
            ApiResponseError::GeoBlocked => Self::GeoBlocked,
            ApiResponseError::FetchFailed(msg) => Self::FetchFailed(msg),
            ApiResponseError::InvalidResponse(_) => Self::InvalidResponse,
        }
    }
}

impl From<ScApiError> for String {
    fn from(err: ScApiError) -> Self {
        err.to_string()
    }
}

#[derive(Debug, Error, Serialize)]
pub enum DownloadError {
    #[error("{0}")]
    DownloadFailed(String),

    #[error("Download binary not found")]
    BinaryNotFound,

    #[error("Rate limited by SoundCloud")]
    RateLimited(Option<RateLimitInfo>),

    #[error("{0}")]
    GeoBlocked(String),

    #[error("{0}")]
    TrackUnavailable(String),

    #[error("{0}")]
    NetworkError(String),

    #[error("{0}")]
    ConversionFailed(String),

    #[error("{0}")]
    AuthRequired(String),

    #[error("Download cancelled")]
    Cancelled,

    #[error("Stream resolution failed: {0}")]
    StreamResolutionFailed(String),
}

impl HasErrorCode for DownloadError {
    fn code(&self) -> &'static str {
        match self {
            DownloadError::DownloadFailed(_) => "DOWNLOAD_FAILED",
            DownloadError::BinaryNotFound => "DOWNLOAD_FAILED",
            DownloadError::RateLimited(_) => "RATE_LIMITED",
            DownloadError::GeoBlocked(_) => "GEO_BLOCKED",
            DownloadError::TrackUnavailable(_) => "DOWNLOAD_FAILED",
            DownloadError::NetworkError(_) => "NETWORK_ERROR",
            DownloadError::ConversionFailed(_) => "CONVERSION_FAILED",
            DownloadError::AuthRequired(_) => "AUTH_REQUIRED",
            DownloadError::Cancelled => "CANCELLED",
            DownloadError::StreamResolutionFailed(_) => "STREAM_RESOLUTION_FAILED",
        }
    }
}

impl From<FfmpegError> for DownloadError {
    fn from(err: FfmpegError) -> Self {
        match err {
            FfmpegError::BinaryNotFound => DownloadError::BinaryNotFound,
        }
    }
}

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("No browser cookie found")]
    NoCookieFound,

    #[error("Cookie verification failed: {0}")]
    VerificationFailed(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] rquest::Error),

    #[error("Profile fetch failed: {0}")]
    ProfileFetchFailed(String),
}

impl HasErrorCode for AuthError {
    fn code(&self) -> &'static str {
        match self {
            AuthError::NoCookieFound => "NO_COOKIE_FOUND",
            AuthError::VerificationFailed(_) => "VERIFICATION_FAILED",
            AuthError::NetworkError(_) => "NETWORK_ERROR",
            AuthError::ProfileFetchFailed(_) => "PROFILE_FETCH_FAILED",
        }
    }
}

impl From<AuthError> for String {
    fn from(err: AuthError) -> Self {
        err.to_string()
    }
}

macro_rules! define_api_error {
    ($name:ident, $api_code:expr) => {
        #[derive(Debug, Error, Serialize)]
        pub enum $name {
            #[error("API error ({0}): {1}")]
            ApiError(u16, String),

            #[error("Network error: {0}")]
            NetworkError(String),
        }

        impl HasErrorCode for $name {
            fn code(&self) -> &'static str {
                match self {
                    $name::ApiError(_, _) => $api_code,
                    $name::NetworkError(_) => "NETWORK_ERROR",
                }
            }
        }

        impl From<rquest::Error> for $name {
            fn from(e: rquest::Error) -> Self {
                $name::NetworkError(e.to_string())
            }
        }

        impl From<$name> for String {
            fn from(err: $name) -> Self {
                err.to_string()
            }
        }
    };
}

define_api_error!(FollowError, "FOLLOW_API_ERROR");
define_api_error!(LikeTrackError, "LIKE_TRACK_API_ERROR");
define_api_error!(LikePlaylistError, "LIKE_PLAYLIST_API_ERROR");

#[derive(Debug, Error, Serialize)]
pub enum RekordboxError {
    #[error("Rekordbox not found: {0}")]
    NotFound(String),

    #[error("Invalid Rekordbox playlist: {0}")]
    InvalidPlaylist(String),

    #[error("Invalid Rekordbox path: {0}")]
    InvalidPath(String),

    #[error("Rekordbox is running — close it before making changes")]
    RekordboxRunning,

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Backup failed: {0}")]
    BackupFailed(String),

    #[error("Restore failed: {0}")]
    RestoreFailed(String),

    #[error("File operation failed: {0}")]
    FileError(String),

    #[error("XML sync failed: {0}")]
    XmlError(String),
}

impl HasErrorCode for RekordboxError {
    fn code(&self) -> &'static str {
        match self {
            RekordboxError::NotFound(_) => "REKORDBOX_NOT_FOUND",
            RekordboxError::InvalidPlaylist(_) => "REKORDBOX_INVALID_PLAYLIST",
            RekordboxError::InvalidPath(_) => "REKORDBOX_INVALID_PATH",
            RekordboxError::RekordboxRunning => "REKORDBOX_RUNNING",
            RekordboxError::DatabaseError(_) => "REKORDBOX_DB_ERROR",
            RekordboxError::BackupFailed(_) => "REKORDBOX_BACKUP_FAILED",
            RekordboxError::RestoreFailed(_) => "REKORDBOX_RESTORE_FAILED",
            RekordboxError::FileError(_) => "REKORDBOX_FILE_ERROR",
            RekordboxError::XmlError(_) => "REKORDBOX_XML_ERROR",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_cookie_found_error_message() {
        let err = AuthError::NoCookieFound;
        assert_eq!(err.to_string(), "No browser cookie found");
    }

    #[test]
    fn test_verification_failed_error_message() {
        let err = AuthError::VerificationFailed("API returned 401".to_string());
        assert_eq!(err.to_string(), "Cookie verification failed: API returned 401");
    }

    #[test]
    fn test_profile_fetch_failed_error_message() {
        let err = AuthError::ProfileFetchFailed("User not found".to_string());
        assert_eq!(err.to_string(), "Profile fetch failed: User not found");
    }

    #[test]
    fn test_error_response_from_no_cookie_found() {
        let err = AuthError::NoCookieFound;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "NO_COOKIE_FOUND");
    }

    #[test]
    fn test_error_response_from_verification_failed() {
        let err = AuthError::VerificationFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "VERIFICATION_FAILED");
    }

    #[test]
    fn test_error_response_from_profile_fetch_failed() {
        let err = AuthError::ProfileFetchFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "PROFILE_FETCH_FAILED");
    }

    #[test]
    fn test_download_download_failed_error_message() {
        let err = DownloadError::DownloadFailed("Connection timeout".to_string());
        assert_eq!(err.to_string(), "Connection timeout");
    }

    #[test]
    fn test_download_binary_not_found_error_message() {
        let err = DownloadError::BinaryNotFound;
        assert_eq!(err.to_string(), "Download binary not found");
    }

    #[test]
    fn test_download_rate_limited_error_message() {
        let err = DownloadError::RateLimited(None);
        assert_eq!(err.to_string(), "Rate limited by SoundCloud");
    }

    #[test]
    fn test_download_geo_blocked_error_message() {
        let err = DownloadError::GeoBlocked("Not available in your region".to_string());
        assert_eq!(err.to_string(), "Not available in your region");
    }

    #[test]
    fn test_error_response_from_download_failed() {
        let err = DownloadError::DownloadFailed("test error".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "DOWNLOAD_FAILED");
        assert_eq!(response.message, "test error");
    }

    #[test]
    fn test_error_response_from_download_binary_not_found() {
        let err = DownloadError::BinaryNotFound;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "DOWNLOAD_FAILED");
    }

    #[test]
    fn test_error_response_from_download_rate_limited() {
        let err = DownloadError::RateLimited(None);
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "RATE_LIMITED");
    }

    #[test]
    fn test_error_response_from_download_geo_blocked() {
        let err = DownloadError::GeoBlocked("Geographic restriction".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "GEO_BLOCKED");
    }

    #[test]
    fn test_download_auth_required_error_message() {
        let err = DownloadError::AuthRequired("Sign in required to access this content".to_string());
        assert_eq!(err.to_string(), "Sign in required to access this content");
    }

    #[test]
    fn test_error_response_from_download_auth_required() {
        let err = DownloadError::AuthRequired("Sign in required".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "AUTH_REQUIRED");
    }

    #[test]
    fn test_download_error_code_method() {
        assert_eq!(DownloadError::DownloadFailed("test".to_string()).code(), "DOWNLOAD_FAILED");
        assert_eq!(DownloadError::BinaryNotFound.code(), "DOWNLOAD_FAILED");
        assert_eq!(DownloadError::RateLimited(None).code(), "RATE_LIMITED");
        assert_eq!(DownloadError::GeoBlocked("test".to_string()).code(), "GEO_BLOCKED");
        assert_eq!(DownloadError::TrackUnavailable("test".to_string()).code(), "DOWNLOAD_FAILED");
        assert_eq!(DownloadError::NetworkError("test".to_string()).code(), "NETWORK_ERROR");
        assert_eq!(DownloadError::ConversionFailed("test".to_string()).code(), "CONVERSION_FAILED");
        assert_eq!(DownloadError::AuthRequired("test".to_string()).code(), "AUTH_REQUIRED");
    }

    #[test]
    fn test_ffmpeg_binary_not_found_error_message() {
        let err = FfmpegError::BinaryNotFound;
        assert_eq!(err.to_string(), "FFmpeg binary not found");
    }

    #[test]
    fn test_error_response_from_ffmpeg_binary_not_found() {
        let err = FfmpegError::BinaryNotFound;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "BINARY_NOT_FOUND");
    }

    #[test]
    fn test_metadata_write_failed_error_message() {
        let err = MetadataError::WriteFailed("Permission denied".to_string());
        assert_eq!(err.to_string(), "Failed to write metadata: Permission denied");
    }

    #[test]
    fn test_metadata_artwork_failed_error_message() {
        let err = MetadataError::ArtworkFailed("HTTP 404".to_string());
        assert_eq!(err.to_string(), "Failed to download artwork: HTTP 404");
    }

    #[test]
    fn test_metadata_error_code_method() {
        assert_eq!(MetadataError::WriteFailed("test".to_string()).code(), "METADATA_WRITE_FAILED");
        assert_eq!(MetadataError::ArtworkFailed("test".to_string()).code(), "ARTWORK_DOWNLOAD_FAILED");
    }

    #[test]
    fn test_error_response_from_metadata_write_failed() {
        let err = MetadataError::WriteFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "METADATA_WRITE_FAILED");
        assert!(response.message.contains("Failed to write metadata"));
    }

    #[test]
    fn test_error_response_from_metadata_artwork_failed() {
        let err = MetadataError::ArtworkFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "ARTWORK_DOWNLOAD_FAILED");
        assert!(response.message.contains("Failed to download artwork"));
    }

    #[test]
    fn test_follow_api_error_message() {
        let err = FollowError::ApiError(403, "Forbidden".to_string());
        assert_eq!(err.to_string(), "API error (403): Forbidden");
    }

    #[test]
    fn test_follow_network_error_message() {
        let err = FollowError::NetworkError("timeout".to_string());
        assert_eq!(err.to_string(), "Network error: timeout");
    }

    #[test]
    fn test_follow_error_codes() {
        assert_eq!(FollowError::ApiError(500, "err".to_string()).code(), "FOLLOW_API_ERROR");
        assert_eq!(FollowError::NetworkError("err".to_string()).code(), "NETWORK_ERROR");
    }

    #[test]
    fn test_error_response_from_follow_api_error() {
        let err = FollowError::ApiError(403, "Forbidden".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "FOLLOW_API_ERROR");
    }

    #[test]
    fn test_like_playlist_api_error_message() {
        let err = LikePlaylistError::ApiError(403, "Forbidden".to_string());
        assert_eq!(err.to_string(), "API error (403): Forbidden");
    }

    #[test]
    fn test_like_playlist_network_error_message() {
        let err = LikePlaylistError::NetworkError("timeout".to_string());
        assert_eq!(err.to_string(), "Network error: timeout");
    }

    #[test]
    fn test_like_playlist_error_codes() {
        assert_eq!(LikePlaylistError::ApiError(500, "err".to_string()).code(), "LIKE_PLAYLIST_API_ERROR");
        assert_eq!(LikePlaylistError::NetworkError("err".to_string()).code(), "NETWORK_ERROR");
    }

    #[test]
    fn test_error_response_from_like_playlist_api_error() {
        let err = LikePlaylistError::ApiError(403, "Forbidden".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "LIKE_PLAYLIST_API_ERROR");
    }
}
