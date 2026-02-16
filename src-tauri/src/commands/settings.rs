use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;
use uuid::Uuid;

#[tauri::command]
#[specta::specta]
pub async fn check_write_permission(path: String) -> Result<bool, String> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Try to create and delete a temp file to verify write access
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
    app.path()
        .download_dir()
        .map(|p: PathBuf| p.to_string_lossy().to_string())
        .map_err(|e: tauri::Error| e.to_string())
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

    #[tokio::test]
    async fn check_write_permission_returns_true_for_writable_dir() {
        let temp_dir = tempdir().unwrap();
        let path = temp_dir.path().to_string_lossy().to_string();

        let result = check_write_permission(path).await;
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn check_write_permission_returns_error_for_nonexistent_dir() {
        let result = check_write_permission("/nonexistent/path/12345".to_string()).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Directory does not exist");
    }

    #[tokio::test]
    async fn check_write_permission_returns_error_for_file_path() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("testfile.txt");
        fs::write(&file_path, "test").unwrap();

        let result = check_write_permission(file_path.to_string_lossy().to_string()).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Path is not a directory");
    }
}
