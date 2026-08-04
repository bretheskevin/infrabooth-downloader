use std::path::{Component, Path, PathBuf};

use tauri::Manager;

/// Gets the system downloads directory.
///
/// Returns the OS-specific downloads folder path.
pub fn get_downloads_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().download_dir().map_err(|e| format!("Failed to get downloads directory: {}", e))
}

pub fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| format!("Failed to get app data directory: {}", e))
}

pub fn is_within_allowed_dirs(canonical_target: &std::path::Path, allowed_dirs: &[PathBuf]) -> bool {
    allowed_dirs.iter().filter_map(|d| std::fs::canonicalize(d).ok()).any(|d| canonical_target.starts_with(&d))
}

pub fn home_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().home_dir().map_err(|e| format!("Failed to get home directory: {}", e))
}

/// Confines a user-supplied output directory to the user's home directory.
///
/// Untrusted callers (remote WebView, remote server) can pass an arbitrary
/// `output_dir` to the download commands; this gates it against the same home
/// boundary the folder picker enforces, returning the resolved path to use.
pub fn confine_to_home(app: &tauri::AppHandle, target: &Path) -> Result<PathBuf, String> {
    confine_within(target, &[home_dir(app)?])
}

/// Confines an already-existing directory to the user's home directory.
///
/// Unlike [`confine_to_home`], `target` must exist: it is fully canonicalized
/// (resolving symlinks) before the home-boundary check, and the resolved path
/// is returned. Used by the write-permission check for the folder picker.
pub fn confine_existing_to_home(app: &tauri::AppHandle, target: &Path) -> Result<PathBuf, String> {
    let canonical = std::fs::canonicalize(target).map_err(|_| "Directory does not exist".to_string())?;
    if is_within_allowed_dirs(&canonical, &[home_dir(app)?]) {
        Ok(canonical)
    } else {
        Err("Path is outside the home directory".to_string())
    }
}

/// Resolves `target` and verifies it stays within one of `allowed_dirs`.
///
/// Rejects relative paths, resolves symlinks in the existing portion of the
/// path, and forbids `..` traversal in the not-yet-created tail so a download
/// target that does not exist yet cannot escape the boundary.
pub fn confine_within(target: &Path, allowed_dirs: &[PathBuf]) -> Result<PathBuf, String> {
    if !target.is_absolute() {
        return Err("Path must be absolute".to_string());
    }

    let resolved = resolve_existing_prefix(target)?;
    if is_within_allowed_dirs(&resolved, allowed_dirs) {
        Ok(resolved)
    } else {
        Err("Path is outside the allowed location".to_string())
    }
}

fn resolve_existing_prefix(target: &Path) -> Result<PathBuf, String> {
    let mut ancestor = target;
    loop {
        if let Ok(canonical) = std::fs::canonicalize(ancestor) {
            let tail = target.strip_prefix(ancestor).map_err(|_| "Invalid path".to_string())?;
            let mut resolved = canonical;
            for component in tail.components() {
                match component {
                    Component::Normal(part) => resolved.push(part),
                    Component::CurDir => {}
                    _ => return Err("Path must not contain traversal segments".to_string()),
                }
            }
            return Ok(resolved);
        }
        match ancestor.parent() {
            Some(parent) => ancestor = parent,
            None => return Err("Path could not be resolved".to_string()),
        }
    }
}

pub async fn persist_json(path: &std::path::Path, json: String) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    tokio::fs::write(path, json).await.map_err(|e| format!("Failed to persist state: {}", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn confine_within_allows_existing_subdir() {
        let home = tempdir().unwrap();
        let sub = home.path().join("Downloads");
        std::fs::create_dir(&sub).unwrap();

        assert!(confine_within(&sub, &[home.path().to_path_buf()]).is_ok());
    }

    #[test]
    fn confine_within_allows_not_yet_created_subdir() {
        let home = tempdir().unwrap();
        let sub = home.path().join("Music").join("New Album");

        assert!(confine_within(&sub, &[home.path().to_path_buf()]).is_ok());
    }

    #[test]
    fn confine_within_rejects_path_outside_home() {
        let home = tempdir().unwrap();
        let outside = tempdir().unwrap();

        assert!(confine_within(&outside.path().join("stolen"), &[home.path().to_path_buf()]).is_err());
    }

    #[test]
    fn confine_within_rejects_relative_path() {
        let home = tempdir().unwrap();

        assert!(confine_within(Path::new("relative/dir"), &[home.path().to_path_buf()]).is_err());
    }

    #[test]
    fn confine_within_rejects_traversal_via_existing_prefix() {
        let home = tempdir().unwrap();
        let sub = home.path().join("Downloads");
        std::fs::create_dir(&sub).unwrap();

        let escape = sub.join("..").join("..").join("evil");
        assert!(confine_within(&escape, &[home.path().to_path_buf()]).is_err());
    }

    #[test]
    fn confine_within_rejects_traversal_in_pending_tail() {
        let home = tempdir().unwrap();

        let escape = home.path().join("Missing").join("..").join("..").join("evil");
        assert!(confine_within(&escape, &[home.path().to_path_buf()]).is_err());
    }
}
