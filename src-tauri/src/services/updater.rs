use serde::Serialize;
use specta::Type;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;
use time::format_description::well_known::Rfc3339;

/// Information about an available update.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Checks for available updates.
///
/// # Returns
/// * `Ok(Some(UpdateInfo))` - An update is available
/// * `Ok(None)` - No update available (current version is latest)
/// * `Err(String)` - Error checking for updates
pub async fn check_for_update(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => Ok(Some(UpdateInfo {
            version: update.version.clone(),
            body: update.body.clone(),
            date: update.date.and_then(|d| d.format(&Rfc3339).ok()),
        })),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_info_serializes_correctly() {
        let info = UpdateInfo {
            version: "1.0.0".to_string(),
            body: Some("Release notes".to_string()),
            date: Some("2024-01-01T00:00:00Z".to_string()),
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"version\":\"1.0.0\""));
        assert!(json.contains("\"body\":\"Release notes\""));
    }

    #[test]
    fn test_update_info_serializes_with_none_fields() {
        let info = UpdateInfo {
            version: "1.0.0".to_string(),
            body: None,
            date: None,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"version\":\"1.0.0\""));
        assert!(json.contains("\"body\":null"));
        assert!(json.contains("\"date\":null"));
    }
}
