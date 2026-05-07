use std::fs;
use std::path::Path;
use tauri::Manager;
use uuid::Uuid;

use crate::services::config::skip_tls_verify;
use crate::services::paths::{get_app_data_dir, get_downloads_dir, is_within_allowed_dirs};

#[tauri::command]
#[specta::specta]
pub async fn check_write_permission(path: String, app: tauri::AppHandle) -> Result<bool, String> {
    let dir_path = std::fs::canonicalize(Path::new(&path)).map_err(|_| "Directory does not exist".to_string())?;

    let home_dir = app.path().home_dir().map_err(|e| format!("Failed to get home directory: {}", e))?;

    if !is_within_allowed_dirs(&dir_path, &[home_dir]) {
        return Err("Path is outside the home directory".to_string());
    }

    try_write_permission(&dir_path)
}

fn try_write_permission(dir_path: &Path) -> Result<bool, String> {
    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let test_file = dir_path.join(format!(".sc-downloader-test-{}", Uuid::new_v4()));

    match fs::write(&test_file, "test") {
        Ok(_) => {
            let _ = fs::remove_file(&test_file);
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}

#[tauri::command]
#[specta::specta]
pub fn get_default_download_path(app: tauri::AppHandle) -> Result<String, String> {
    get_downloads_dir(&app).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    get_app_data_dir(&app).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_log_path(app: tauri::AppHandle) -> Result<String, String> {
    get_app_data_dir(&app).map(|p| p.join("logs").to_string_lossy().to_string())
}

const DEFAULT_FEATURE_FLAGS: &str = include_str!("../../feature-flags.toml");

fn line_key(line: &str) -> Option<&str> {
    let before_comment = line.split('#').next().unwrap_or("").trim();
    let (key, _) = before_comment.split_once('=')?;
    let key = key.trim();
    if key.is_empty() {
        None
    } else {
        Some(key)
    }
}

fn parse_flag_keys(source: &str) -> Vec<String> {
    source.lines().filter_map(|line| line_key(line).map(str::to_string)).collect()
}

fn extract_flag_block(source: &str, key: &str) -> Option<String> {
    let lines: Vec<&str> = source.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        if line_key(line) == Some(key) {
            let mut start = i;
            while start > 0 && lines[start - 1].trim_start().starts_with('#') {
                start -= 1;
            }
            return Some(lines[start..=i].join("\n") + "\n");
        }
    }
    None
}

fn remove_flag_block(source: &str, key: &str) -> String {
    let lines: Vec<&str> = source.lines().collect();
    let mut to_remove = std::collections::HashSet::new();

    for (i, line) in lines.iter().enumerate() {
        if line_key(line) == Some(key) {
            let mut start = i;
            while start > 0 && lines[start - 1].trim_start().starts_with('#') {
                start -= 1;
            }
            for j in start..=i {
                to_remove.insert(j);
            }
            if i + 1 < lines.len() && lines[i + 1].trim().is_empty() {
                to_remove.insert(i + 1);
            }
            break;
        }
    }

    lines.iter().enumerate().filter(|(i, _)| !to_remove.contains(i)).map(|(_, line)| *line).collect::<Vec<_>>().join("\n") + "\n"
}

#[tauri::command]
#[specta::specta]
pub fn get_feature_flags(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = get_app_data_dir(&app)?;
    let flags_path = app_data.join("feature-flags.toml");

    if !flags_path.exists() {
        fs::create_dir_all(&app_data).map_err(|e| format!("Failed to create app data dir: {}", e))?;
        fs::write(&flags_path, DEFAULT_FEATURE_FLAGS).map_err(|e| format!("Failed to write default feature flags: {}", e))?;
        return Ok(DEFAULT_FEATURE_FLAGS.to_string());
    }

    let mut content = fs::read_to_string(&flags_path).map_err(|e| format!("Failed to read feature flags: {}", e))?;

    let existing_keys = parse_flag_keys(&content);
    let default_keys = parse_flag_keys(DEFAULT_FEATURE_FLAGS);

    let mut dirty = false;

    // Remove stale keys (present in user file but not in defaults)
    for key in &existing_keys {
        if !default_keys.iter().any(|k| k == key) {
            content = remove_flag_block(&content, key);
            dirty = true;
        }
    }

    // Append missing keys (present in defaults but not in user file)
    for key in &default_keys {
        if !existing_keys.iter().any(|k| k == key) {
            if let Some(block) = extract_flag_block(DEFAULT_FEATURE_FLAGS, key) {
                if !content.ends_with('\n') {
                    content.push('\n');
                }
                content.push('\n');
                content.push_str(&block);
                dirty = true;
            }
        }
    }

    if dirty {
        fs::write(&flags_path, &content).map_err(|e| format!("Failed to update feature flags: {}", e))?;
    }

    Ok(content)
}

#[tauri::command]
#[specta::specta]
pub fn validate_download_path(path: String) -> Result<bool, String> {
    let dir_path = Path::new(&path);

    // Check existence
    if !dir_path.exists() {
        return Ok(false);
    }

    // Check it's a directory (not a file)
    if !dir_path.is_dir() {
        return Ok(false);
    }

    Ok(true)
}

#[tauri::command]
#[specta::specta]
pub fn is_tls_verify_disabled() -> bool {
    skip_tls_verify()
}

#[tauri::command]
#[specta::specta]
pub fn enable_tls_verify() -> Result<(), String> {
    crate::services::config::enable_tls_verify()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn validate_download_path_returns_true_for_existing_dir() {
        let temp_dir = tempdir().unwrap();
        let path = temp_dir.path().to_string_lossy().to_string();

        let result = validate_download_path(path);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn validate_download_path_returns_false_for_nonexistent_path() {
        let result = validate_download_path("/nonexistent/path/12345".to_string());
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn validate_download_path_returns_false_for_file_path() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("testfile.txt");
        fs::write(&file_path, "test").unwrap();

        let result = validate_download_path(file_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn try_write_permission_returns_true_for_writable_dir() {
        let temp_dir = tempdir().unwrap();
        let result = try_write_permission(temp_dir.path());
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn try_write_permission_returns_error_for_file_path() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("testfile.txt");
        fs::write(&file_path, "test").unwrap();

        let result = try_write_permission(&file_path);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Path is not a directory");
    }
}
