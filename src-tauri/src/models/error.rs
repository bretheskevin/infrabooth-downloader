use serde::Serialize;
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
pub enum DownloadError {
    #[error("{0}")]
    DownloadFailed(String),

    #[error("Download binary not found")]
    BinaryNotFound,

    #[error("Rate limited by SoundCloud")]
    RateLimited,

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

    #[error("Authentication refresh failed")]
    AuthRefreshFailed,

    #[error("Stream resolution failed: {0}")]
    StreamResolutionFailed(String),
}

impl HasErrorCode for DownloadError {
    fn code(&self) -> &'static str {
        match self {
            DownloadError::DownloadFailed(_) => "DOWNLOAD_FAILED",
            DownloadError::BinaryNotFound => "DOWNLOAD_FAILED",
            DownloadError::RateLimited => "RATE_LIMITED",
            DownloadError::GeoBlocked(_) => "GEO_BLOCKED",
            DownloadError::TrackUnavailable(_) => "DOWNLOAD_FAILED",
            DownloadError::NetworkError(_) => "NETWORK_ERROR",
            DownloadError::ConversionFailed(_) => "CONVERSION_FAILED",
            DownloadError::AuthRequired(_) => "AUTH_REQUIRED",
            DownloadError::Cancelled => "CANCELLED",
            DownloadError::AuthRefreshFailed => "AUTH_REFRESH_FAILED",
            DownloadError::StreamResolutionFailed(_) => "STREAM_RESOLUTION_FAILED",
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
    Download(#[from] DownloadError),
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
        let err = DownloadError::RateLimited;
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
        let err = DownloadError::RateLimited;
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
        assert_eq!(
            DownloadError::DownloadFailed("test".to_string()).code(),
            "DOWNLOAD_FAILED"
        );
        assert_eq!(DownloadError::BinaryNotFound.code(), "DOWNLOAD_FAILED");
        assert_eq!(DownloadError::RateLimited.code(), "RATE_LIMITED");
        assert_eq!(
            DownloadError::GeoBlocked("test".to_string()).code(),
            "GEO_BLOCKED"
        );
        assert_eq!(
            DownloadError::TrackUnavailable("test".to_string()).code(),
            "DOWNLOAD_FAILED"
        );
        assert_eq!(
            DownloadError::NetworkError("test".to_string()).code(),
            "NETWORK_ERROR"
        );
        assert_eq!(
            DownloadError::ConversionFailed("test".to_string()).code(),
            "CONVERSION_FAILED"
        );
        assert_eq!(
            DownloadError::AuthRequired("test".to_string()).code(),
            "AUTH_REQUIRED"
        );
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
        let err = PipelineError::Download(DownloadError::DownloadFailed("test error".to_string()));
        assert_eq!(err.to_string(), "Download failed: test error");
    }

    #[test]
    fn test_pipeline_error_code_download() {
        let err = PipelineError::Download(DownloadError::GeoBlocked("test".to_string()));
        assert_eq!(err.code(), "GEO_BLOCKED");
    }

    #[test]
    fn test_error_response_from_pipeline_download() {
        let err = PipelineError::Download(DownloadError::RateLimited);
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
