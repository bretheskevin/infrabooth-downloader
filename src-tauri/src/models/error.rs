use serde::Serialize;
use thiserror::Error;

pub trait HasErrorCode {
    fn code(&self) -> &'static str;
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
}

impl<T: HasErrorCode + std::fmt::Display> From<T> for ErrorResponse {
    fn from(err: T) -> Self {
        ErrorResponse {
            code: err.code().to_string(),
            message: err.to_string(),
        }
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

#[derive(Debug, Error, Serialize)]
pub enum YtDlpError {
    #[error("Download failed: {0}")]
    DownloadFailed(String),

    #[error("yt-dlp binary not found")]
    BinaryNotFound,

    #[error("Rate limited by SoundCloud")]
    RateLimited,

    #[error("Content is geo-blocked")]
    GeoBlocked,

    #[error("Track not found")]
    NotFound,

    #[error("Authentication required")]
    AuthRequired,

    #[error("Download cancelled")]
    Cancelled,
}

impl HasErrorCode for YtDlpError {
    fn code(&self) -> &'static str {
        match self {
            YtDlpError::DownloadFailed(_) => "DOWNLOAD_FAILED",
            YtDlpError::BinaryNotFound => "DOWNLOAD_FAILED",
            YtDlpError::RateLimited => "RATE_LIMITED",
            YtDlpError::GeoBlocked => "GEO_BLOCKED",
            YtDlpError::NotFound => "INVALID_URL",
            YtDlpError::AuthRequired => "AUTH_REQUIRED",
            YtDlpError::Cancelled => "CANCELLED",
        }
    }
}

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Missing client secret configuration")]
    MissingClientSecret,

    #[error("Token exchange failed: {0}")]
    TokenExchangeFailed(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("No OAuth flow in progress")]
    NoFlowInProgress,

    #[error("Profile fetch failed: {0}")]
    ProfileFetchFailed(String),

    #[error("Token refresh failed: {0}")]
    RefreshFailed(String),
}

impl HasErrorCode for AuthError {
    fn code(&self) -> &'static str {
        match self {
            AuthError::MissingClientSecret => "MISSING_CLIENT_SECRET",
            AuthError::TokenExchangeFailed(_) => "TOKEN_EXCHANGE_FAILED",
            AuthError::NetworkError(_) => "NETWORK_ERROR",
            AuthError::NoFlowInProgress => "NO_FLOW_IN_PROGRESS",
            AuthError::ProfileFetchFailed(_) => "PROFILE_FETCH_FAILED",
            AuthError::RefreshFailed(_) => "REFRESH_FAILED",
        }
    }
}

impl From<AuthError> for String {
    fn from(err: AuthError) -> Self {
        err.to_string()
    }
}

#[derive(Debug, Error)]
pub enum PipelineError {
    #[error("Download failed: {0}")]
    Download(#[from] YtDlpError),
}

impl HasErrorCode for PipelineError {
    fn code(&self) -> &'static str {
        match self {
            PipelineError::Download(e) => e.code(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_missing_client_secret_error_message() {
        let err = AuthError::MissingClientSecret;
        assert_eq!(err.to_string(), "Missing client secret configuration");
    }

    #[test]
    fn test_token_exchange_failed_error_message() {
        let err = AuthError::TokenExchangeFailed("Invalid grant".to_string());
        assert_eq!(err.to_string(), "Token exchange failed: Invalid grant");
    }

    #[test]
    fn test_no_flow_in_progress_error_message() {
        let err = AuthError::NoFlowInProgress;
        assert_eq!(err.to_string(), "No OAuth flow in progress");
    }

    #[test]
    fn test_error_response_from_missing_client_secret() {
        let err = AuthError::MissingClientSecret;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "MISSING_CLIENT_SECRET");
    }

    #[test]
    fn test_error_response_from_token_exchange_failed() {
        let err = AuthError::TokenExchangeFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "TOKEN_EXCHANGE_FAILED");
    }

    #[test]
    fn test_error_response_from_no_flow_in_progress() {
        let err = AuthError::NoFlowInProgress;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "NO_FLOW_IN_PROGRESS");
    }

    #[test]
    fn test_profile_fetch_failed_error_message() {
        let err = AuthError::ProfileFetchFailed("User not found".to_string());
        assert_eq!(err.to_string(), "Profile fetch failed: User not found");
    }

    #[test]
    fn test_error_response_from_profile_fetch_failed() {
        let err = AuthError::ProfileFetchFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "PROFILE_FETCH_FAILED");
    }

    #[test]
    fn test_refresh_failed_error_message() {
        let err = AuthError::RefreshFailed("Invalid refresh token".to_string());
        assert_eq!(
            err.to_string(),
            "Token refresh failed: Invalid refresh token"
        );
    }

    #[test]
    fn test_error_response_from_refresh_failed() {
        let err = AuthError::RefreshFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "REFRESH_FAILED");
    }

    #[test]
    fn test_ytdlp_download_failed_error_message() {
        let err = YtDlpError::DownloadFailed("Connection timeout".to_string());
        assert_eq!(err.to_string(), "Download failed: Connection timeout");
    }

    #[test]
    fn test_ytdlp_binary_not_found_error_message() {
        let err = YtDlpError::BinaryNotFound;
        assert_eq!(err.to_string(), "yt-dlp binary not found");
    }

    #[test]
    fn test_ytdlp_rate_limited_error_message() {
        let err = YtDlpError::RateLimited;
        assert_eq!(err.to_string(), "Rate limited by SoundCloud");
    }

    #[test]
    fn test_ytdlp_geo_blocked_error_message() {
        let err = YtDlpError::GeoBlocked;
        assert_eq!(err.to_string(), "Content is geo-blocked");
    }

    #[test]
    fn test_error_response_from_ytdlp_download_failed() {
        let err = YtDlpError::DownloadFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "DOWNLOAD_FAILED");
        assert!(response.message.contains("Download failed"));
    }

    #[test]
    fn test_error_response_from_ytdlp_binary_not_found() {
        let err = YtDlpError::BinaryNotFound;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "DOWNLOAD_FAILED");
    }

    #[test]
    fn test_error_response_from_ytdlp_rate_limited() {
        let err = YtDlpError::RateLimited;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "RATE_LIMITED");
    }

    #[test]
    fn test_error_response_from_ytdlp_geo_blocked() {
        let err = YtDlpError::GeoBlocked;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "GEO_BLOCKED");
    }

    #[test]
    fn test_ytdlp_not_found_error_message() {
        let err = YtDlpError::NotFound;
        assert_eq!(err.to_string(), "Track not found");
    }

    #[test]
    fn test_error_response_from_ytdlp_not_found() {
        let err = YtDlpError::NotFound;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "INVALID_URL");
    }

    #[test]
    fn test_ytdlp_auth_required_error_message() {
        let err = YtDlpError::AuthRequired;
        assert_eq!(err.to_string(), "Authentication required");
    }

    #[test]
    fn test_error_response_from_ytdlp_auth_required() {
        let err = YtDlpError::AuthRequired;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "AUTH_REQUIRED");
    }

    #[test]
    fn test_ytdlp_error_code_method() {
        assert_eq!(
            YtDlpError::DownloadFailed("test".to_string()).code(),
            "DOWNLOAD_FAILED"
        );
        assert_eq!(YtDlpError::BinaryNotFound.code(), "DOWNLOAD_FAILED");
        assert_eq!(YtDlpError::RateLimited.code(), "RATE_LIMITED");
        assert_eq!(YtDlpError::GeoBlocked.code(), "GEO_BLOCKED");
        assert_eq!(YtDlpError::NotFound.code(), "INVALID_URL");
        assert_eq!(YtDlpError::AuthRequired.code(), "AUTH_REQUIRED");
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
    fn test_pipeline_download_error_message() {
        let err = PipelineError::Download(YtDlpError::DownloadFailed("test".to_string()));
        assert!(err.to_string().contains("Download failed"));
    }

    #[test]
    fn test_pipeline_error_code_download() {
        let err = PipelineError::Download(YtDlpError::GeoBlocked);
        assert_eq!(err.code(), "GEO_BLOCKED");
    }

    #[test]
    fn test_error_response_from_pipeline_download() {
        let err = PipelineError::Download(YtDlpError::RateLimited);
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "RATE_LIMITED");
    }

    #[test]
    fn test_metadata_write_failed_error_message() {
        let err = MetadataError::WriteFailed("Permission denied".to_string());
        assert_eq!(
            err.to_string(),
            "Failed to write metadata: Permission denied"
        );
    }

    #[test]
    fn test_metadata_artwork_failed_error_message() {
        let err = MetadataError::ArtworkFailed("HTTP 404".to_string());
        assert_eq!(err.to_string(), "Failed to download artwork: HTTP 404");
    }

    #[test]
    fn test_metadata_error_code_method() {
        assert_eq!(
            MetadataError::WriteFailed("test".to_string()).code(),
            "METADATA_WRITE_FAILED"
        );
        assert_eq!(
            MetadataError::ArtworkFailed("test".to_string()).code(),
            "ARTWORK_DOWNLOAD_FAILED"
        );
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
}
