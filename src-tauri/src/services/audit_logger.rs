/// Audit logging system for security events.
/// All security-relevant events are logged with timestamps for compliance and forensics.
use log::info;
use std::sync::OnceLock;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

static AUDIT_LOGGER: OnceLock<()> = OnceLock::new();

/// Security event types for audit logging.
#[derive(Debug, Clone, PartialEq)]
pub enum AuditEventType {
    AuthAttempt,
    AuthSuccess,
    AuthFailure,
    Logout,
    DownloadStarted,
    DownloadCompleted,
    DownloadFailed,
    TokenRefresh,
    SessionTimeout,
    UnauthorizedAccess,
    RateLimitExceeded,
    SecuritySettingsChanged,
}

impl std::fmt::Display for AuditEventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuditEventType::AuthAttempt => write!(f, "AUTH_ATTEMPT"),
            AuditEventType::AuthSuccess => write!(f, "AUTH_SUCCESS"),
            AuditEventType::AuthFailure => write!(f, "AUTH_FAILURE"),
            AuditEventType::Logout => write!(f, "LOGOUT"),
            AuditEventType::DownloadStarted => write!(f, "DOWNLOAD_STARTED"),
            AuditEventType::DownloadCompleted => write!(f, "DOWNLOAD_COMPLETED"),
            AuditEventType::DownloadFailed => write!(f, "DOWNLOAD_FAILED"),
            AuditEventType::TokenRefresh => write!(f, "TOKEN_REFRESH"),
            AuditEventType::SessionTimeout => write!(f, "SESSION_TIMEOUT"),
            AuditEventType::UnauthorizedAccess => write!(f, "UNAUTHORIZED_ACCESS"),
            AuditEventType::RateLimitExceeded => write!(f, "RATE_LIMIT_EXCEEDED"),
            AuditEventType::SecuritySettingsChanged => write!(f, "SECURITY_SETTINGS_CHANGED"),
        }
    }
}

/// Audit log entry with timestamp and event details.
#[derive(Debug, Clone)]
pub struct AuditLogEntry {
    pub timestamp: String,
    pub event_type: AuditEventType,
    pub details: String,
    pub success: bool,
}

/// Centralized audit logger for security events.
/// All methods are non-blocking and prefixed with [AUDIT] for easy log filtering.
pub struct AuditLogger;

impl AuditLogger {
    /// Log a security event with details.
    pub fn log_event(event_type: AuditEventType, details: &str, success: bool) {
        let timestamp = Self::current_timestamp();
        let status = if success { "SUCCESS" } else { "FAILURE" };
        info!("[AUDIT] {} | {} | {} | {}", timestamp, event_type, status, details);
    }

    /// Log successful authentication.
    pub fn log_auth_success(username: &str) {
        let details = format!("user={}", username);
        Self::log_event(AuditEventType::AuthSuccess, &details, true);
    }

    /// Log failed authentication attempt.
    pub fn log_auth_failure(username: &str, reason: &str) {
        let details = format!("user={} | reason={}", username, reason);
        Self::log_event(AuditEventType::AuthFailure, &details, false);
    }

    /// Log user logout.
    pub fn log_logout(username: &str) {
        let details = format!("user={}", username);
        Self::log_event(AuditEventType::Logout, &details, true);
    }

    /// Log download start.
    pub fn log_download_started(track_id: &str, title: &str) {
        let details = format!("track_id={} | title={}", track_id, title);
        Self::log_event(AuditEventType::DownloadStarted, &details, true);
    }

    /// Log successful download completion.
    pub fn log_download_completed(track_id: &str, file_size: u64) {
        let details = format!("track_id={} | file_size={}", track_id, file_size);
        Self::log_event(AuditEventType::DownloadCompleted, &details, true);
    }

    /// Log download failure.
    pub fn log_download_failed(track_id: &str, error: &str) {
        let details = format!("track_id={} | error={}", track_id, error);
        Self::log_event(AuditEventType::DownloadFailed, &details, false);
    }

    /// Log OAuth token refresh.
    pub fn log_token_refresh(success: bool, reason: &str) {
        let details = format!("reason={}", reason);
        Self::log_event(AuditEventType::TokenRefresh, &details, success);
    }

    /// Log session timeout.
    pub fn log_session_timeout(username: &str, session_age_secs: u64) {
        let details = format!("user={} | session_age_secs={}", username, session_age_secs);
        Self::log_event(AuditEventType::SessionTimeout, &details, true);
    }

    /// Log unauthorized access attempt.
    pub fn log_unauthorized_access(endpoint: &str, reason: &str) {
        let details = format!("endpoint={} | reason={}", endpoint, reason);
        Self::log_event(AuditEventType::UnauthorizedAccess, &details, false);
    }

    /// Log rate limit exceeded.
    pub fn log_rate_limit_exceeded(endpoint: &str, limit: u32) {
        let details = format!("endpoint={} | limit={}", endpoint, limit);
        Self::log_event(AuditEventType::RateLimitExceeded, &details, false);
    }

    /// Log security settings change.
    pub fn log_security_settings_changed(setting: &str, old_value: &str, new_value: &str) {
        let details = format!("setting={} | old={} | new={}", setting, old_value, new_value);
        Self::log_event(AuditEventType::SecuritySettingsChanged, &details, true);
    }

    /// Get current ISO 8601 timestamp.
    fn current_timestamp() -> String {
        OffsetDateTime::now_utc().format(&Rfc3339).unwrap_or_else(|_| "unknown".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_event_type_display() {
        assert_eq!(AuditEventType::AuthSuccess.to_string(), "AUTH_SUCCESS");
        assert_eq!(AuditEventType::SessionTimeout.to_string(), "SESSION_TIMEOUT");
    }

    #[test]
    fn test_timestamp_format() {
        let ts = AuditLogger::current_timestamp();
        // Verify RFC 3339 format (example: 2026-05-07T10:30:45.123456+00:00)
        assert!(ts.contains("T"));
        assert!(ts.contains("Z") || ts.contains("+") || ts.contains("-"));
    }
}
