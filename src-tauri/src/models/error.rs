use serde::Serialize;
use thiserror::Error;

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
}
