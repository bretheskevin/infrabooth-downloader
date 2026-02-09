use serde::Serialize;
use thiserror::Error;

/// Errors that can occur during FFmpeg operations.
#[derive(Debug, Error, Serialize)]
pub enum FfmpegError {
    #[error("Conversion failed: {0}")]
    ConversionFailed(String),

    #[error("FFmpeg binary not found")]
    BinaryNotFound,

    #[error("Invalid input file: {0}")]
    InvalidInput(String),

    #[error("Output path error: {0}")]
    OutputError(String),
}

impl From<FfmpegError> for ErrorResponse {
    fn from(err: FfmpegError) -> Self {
        let code = match &err {
            FfmpegError::ConversionFailed(_) => "CONVERSION_FAILED",
            FfmpegError::BinaryNotFound => "BINARY_NOT_FOUND",
            FfmpegError::InvalidInput(_) => "INVALID_INPUT",
            FfmpegError::OutputError(_) => "OUTPUT_ERROR",
        };

        ErrorResponse {
            code: code.to_string(),
            message: err.to_string(),
        }
    }
}

/// Errors that can occur during yt-dlp operations.
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

    #[error("Invalid URL")]
    InvalidUrl,

    #[error("Track not found")]
    NotFound,

    #[error("Authentication required")]
    AuthRequired,
}

impl YtDlpError {
    /// Returns the error code for IPC communication.
    pub fn code(&self) -> &'static str {
        match self {
            YtDlpError::DownloadFailed(_) => "DOWNLOAD_FAILED",
            YtDlpError::BinaryNotFound => "DOWNLOAD_FAILED",
            YtDlpError::RateLimited => "RATE_LIMITED",
            YtDlpError::GeoBlocked => "GEO_BLOCKED",
            YtDlpError::InvalidUrl => "INVALID_URL",
            YtDlpError::NotFound => "INVALID_URL",
            YtDlpError::AuthRequired => "AUTH_REQUIRED",
        }
    }
}

impl From<YtDlpError> for ErrorResponse {
    fn from(err: YtDlpError) -> Self {
        ErrorResponse {
            code: err.code().to_string(),
            message: err.to_string(),
        }
    }
}

/// Authentication errors that can occur during the OAuth flow.
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

/// Serializable error response for IPC.
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
}

impl From<AuthError> for ErrorResponse {
    fn from(err: AuthError) -> Self {
        let code = match &err {
            AuthError::MissingClientSecret => "MISSING_CLIENT_SECRET",
            AuthError::TokenExchangeFailed(_) => "TOKEN_EXCHANGE_FAILED",
            AuthError::NetworkError(_) => "NETWORK_ERROR",
            AuthError::NoFlowInProgress => "NO_FLOW_IN_PROGRESS",
            AuthError::ProfileFetchFailed(_) => "PROFILE_FETCH_FAILED",
            AuthError::RefreshFailed(_) => "REFRESH_FAILED",
        };

        ErrorResponse {
            code: code.to_string(),
            message: err.to_string(),
        }
    }
}

impl From<AuthError> for String {
    fn from(err: AuthError) -> Self {
        err.to_string()
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
        assert_eq!(err.to_string(), "Token refresh failed: Invalid refresh token");
    }

    #[test]
    fn test_error_response_from_refresh_failed() {
        let err = AuthError::RefreshFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "REFRESH_FAILED");
    }

    // YtDlpError tests

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
    fn test_ytdlp_invalid_url_error_message() {
        let err = YtDlpError::InvalidUrl;
        assert_eq!(err.to_string(), "Invalid URL");
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
    fn test_error_response_from_ytdlp_invalid_url() {
        let err = YtDlpError::InvalidUrl;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "INVALID_URL");
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
        assert_eq!(YtDlpError::DownloadFailed("test".to_string()).code(), "DOWNLOAD_FAILED");
        assert_eq!(YtDlpError::BinaryNotFound.code(), "DOWNLOAD_FAILED");
        assert_eq!(YtDlpError::RateLimited.code(), "RATE_LIMITED");
        assert_eq!(YtDlpError::GeoBlocked.code(), "GEO_BLOCKED");
        assert_eq!(YtDlpError::InvalidUrl.code(), "INVALID_URL");
        assert_eq!(YtDlpError::NotFound.code(), "INVALID_URL");
        assert_eq!(YtDlpError::AuthRequired.code(), "AUTH_REQUIRED");
    }

    // FfmpegError tests

    #[test]
    fn test_ffmpeg_conversion_failed_error_message() {
        let err = FfmpegError::ConversionFailed("Codec not supported".to_string());
        assert_eq!(err.to_string(), "Conversion failed: Codec not supported");
    }

    #[test]
    fn test_ffmpeg_binary_not_found_error_message() {
        let err = FfmpegError::BinaryNotFound;
        assert_eq!(err.to_string(), "FFmpeg binary not found");
    }

    #[test]
    fn test_ffmpeg_invalid_input_error_message() {
        let err = FfmpegError::InvalidInput("File not found".to_string());
        assert_eq!(err.to_string(), "Invalid input file: File not found");
    }

    #[test]
    fn test_ffmpeg_output_error_message() {
        let err = FfmpegError::OutputError("Permission denied".to_string());
        assert_eq!(err.to_string(), "Output path error: Permission denied");
    }

    #[test]
    fn test_error_response_from_ffmpeg_conversion_failed() {
        let err = FfmpegError::ConversionFailed("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "CONVERSION_FAILED");
        assert!(response.message.contains("Conversion failed"));
    }

    #[test]
    fn test_error_response_from_ffmpeg_binary_not_found() {
        let err = FfmpegError::BinaryNotFound;
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "BINARY_NOT_FOUND");
    }

    #[test]
    fn test_error_response_from_ffmpeg_invalid_input() {
        let err = FfmpegError::InvalidInput("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "INVALID_INPUT");
    }

    #[test]
    fn test_error_response_from_ffmpeg_output_error() {
        let err = FfmpegError::OutputError("test".to_string());
        let response: ErrorResponse = err.into();
        assert_eq!(response.code, "OUTPUT_ERROR");
    }
}
