use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "lowercase")]
pub enum UrlType {
    Playlist,
    Track,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub valid: bool,
    pub url_type: Option<UrlType>,
    pub error: Option<ValidationError>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ValidationError {
    pub code: String,
    pub message: String,
    pub hint: Option<String>,
}
