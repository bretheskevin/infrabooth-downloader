use crate::models::url::ValidationResult;
use crate::services::url_validator::validate_url;

#[tauri::command]
pub fn validate_soundcloud_url(url: String) -> ValidationResult {
    validate_url(&url)
}
