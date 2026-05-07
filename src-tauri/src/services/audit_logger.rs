/// Audit logging module for security events.
/// Logs critical security actions for forensics and compliance.
use log::info;
use serde::Serialize;
use time::OffsetDateTime;

/// Audit log entry for a security event.
#[derive(Debug, Clone, Serialize)]
pub struct AuditLogEntry {
    /// ISO 8601 timestamp of the event
    pub timestamp: String,
    /// Type of event (login, logout, download, etc)
    pub event_type: AuditEventType,
    /// Event details (user ID, resource, result, etc)
    pub details: String,
    /// Whether the event was successful
    pub success: bool,
}

/// Types of security events to audit.
#[derive(Debug, Clone, Serialize)]
pub enum AuditEventType {
    /// User authentication attempt
    AuthAttempt,
    /// User logout
    Logout,
    /// Download initiated
    DownloadStarted,
    /// Download completed
    DownloadCompleted,
    /// Download failed or cancelled
    DownloadFailed,
    /// Token refresh
    TokenRefresh,
    /// Session timeout
    SessionTimeout,
    /// Unauthorized access attempt
    UnauthorizedAccess,
    /// Rate limit exceeded
    RateLimitExceeded,
    /// Security settings changed
    SecuritySettingsChanged,
}

impl AuditEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AuthAttempt => "AUTH_ATTEMPT",
            Self::Logout => "LOGOUT",
            Self::DownloadStarted => "DOWNLOAD_STARTED",
            Self::DownloadCompleted => "DOWNLOAD_COMPLETED",
            Self::DownloadFailed => "DOWNLOAD_FAILED",
            Self::TokenRefresh => "TOKEN_REFRESH",
            Self::SessionTimeout => "SESSION_TIMEOUT",
            Self::UnauthorizedAccess => "UNAUTHORIZED_ACCESS",
            Self::RateLimitExceeded => "RATE_LIMIT_EXCEEDED",
            Self::SecuritySettingsChanged => "SECURITY_SETTINGS_CHANGED",
        }
    }
}

/// Audit logger for security events.
pub struct AuditLogger;

impl AuditLogger {
    /// Log a security event.
    pub fn log_event(event_type: AuditEventType, details: impl Into<String>, success: bool) {
        let timestamp = OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap_or_else(|_| "UNKNOWN_TIME".to_string());

        let entry = AuditLogEntry { timestamp, event_type: event_type.clone(), details: details.into(), success };

        // Log as info if successful, warn if failed
        if success {
            info!("[AUDIT] {} | {} | {}", entry.event_type.as_str(), entry.timestamp, entry.details);
        } else {
            log::warn!("[AUDIT] {} | {} | {}", entry.event_type.as_str(), entry.timestamp, entry.details);
        }
    }

    /// Log successful authentication.
    pub fn log_auth_success(user_id: u64) {
        Self::log_event(AuditEventType::AuthAttempt, format!("User {} authenticated", user_id), true);
    }

    /// Log failed authentication.
    pub fn log_auth_failure(reason: &str) {
        Self::log_event(AuditEventType::AuthAttempt, format!("Authentication failed: {}", reason), false);
    }

    /// Log user logout.
    pub fn log_logout(user_id: u64) {
        Self::log_event(AuditEventType::Logout, format!("User {} logged out", user_id), true);
    }

    /// Log download started.
    pub fn log_download_started(track_id: &str, track_title: &str) {
        Self::log_event(AuditEventType::DownloadStarted, format!("Track {} ({}) download started", track_id, track_title), true);
    }

    /// Log download completed.
    pub fn log_download_completed(track_id: &str, file_path: &str) {
        Self::log_event(AuditEventType::DownloadCompleted, format!("Track {} downloaded to {}", track_id, file_path), true);
    }

    /// Log download failed.
    pub fn log_download_failed(track_id: &str, reason: &str) {
        Self::log_event(AuditEventType::DownloadFailed, format!("Track {} download failed: {}", track_id, reason), false);
    }

    /// Log token refresh.
    pub fn log_token_refresh(success: bool) {
        Self::log_event(AuditEventType::TokenRefresh, "Token refresh attempt", success);
    }

    /// Log session timeout.
    pub fn log_session_timeout(user_id: u64) {
        Self::log_event(AuditEventType::SessionTimeout, format!("Session timeout for user {}", user_id), true);
    }

    /// Log unauthorized access attempt.
    pub fn log_unauthorized_access(resource: &str, reason: &str) {
        Self::log_event(AuditEventType::UnauthorizedAccess, format!("Unauthorized access to {}: {}", resource, reason), false);
    }

    /// Log rate limit exceeded.
    pub fn log_rate_limit_exceeded(endpoint: &str) {
        Self::log_event(AuditEventType::RateLimitExceeded, format!("Rate limit exceeded on {}", endpoint), false);
    }

    /// Log security settings change.
    pub fn log_security_settings_changed(setting: &str, old_value: &str, new_value: &str) {
        Self::log_event(AuditEventType::SecuritySettingsChanged, format!("Security setting {} changed from '{}' to '{}'", setting, old_value, new_value), true);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_event_type_str() {
        assert_eq!(AuditEventType::AuthAttempt.as_str(), "AUTH_ATTEMPT");
        assert_eq!(AuditEventType::Logout.as_str(), "LOGOUT");
        assert_eq!(AuditEventType::DownloadStarted.as_str(), "DOWNLOAD_STARTED");
        assert_eq!(AuditEventType::RateLimitExceeded.as_str(), "RATE_LIMIT_EXCEEDED");
    }

    #[test]
    fn test_audit_log_entry_creation() {
        let entry = AuditLogEntry {
            timestamp: "2026-05-07T12:00:00Z".to_string(),
            event_type: AuditEventType::AuthAttempt,
            details: "User 123 authenticated".to_string(),
            success: true,
        };

        assert_eq!(entry.event_type.as_str(), "AUTH_ATTEMPT");
        assert!(entry.success);
        assert_eq!(entry.details, "User 123 authenticated");
    }
}
