use std::path::{Component, Path, PathBuf};

use tauri::Manager;

pub fn get_downloads_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().download_dir().map_err(|e| format!("Failed to get downloads directory: {}", e))
}

pub fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| format!("Failed to get app data directory: {}", e))
}

#[cfg(target_os = "windows")]
fn protected_dirs() -> Vec<PathBuf> {
    let sysroot = std::env::var("SystemRoot").or_else(|_| std::env::var("windir")).unwrap_or_else(|_| "C:\\Windows".to_string());
    vec![PathBuf::from(sysroot)]
}

#[cfg(target_os = "macos")]
fn protected_dirs() -> Vec<PathBuf> {
    vec![PathBuf::from("/System"), PathBuf::from("/usr"), PathBuf::from("/bin"), PathBuf::from("/sbin")]
}

#[cfg(target_os = "linux")]
fn protected_dirs() -> Vec<PathBuf> {
    vec![
        PathBuf::from("/etc"),
        PathBuf::from("/boot"),
        PathBuf::from("/proc"),
        PathBuf::from("/sys"),
        PathBuf::from("/dev"),
        PathBuf::from("/usr"),
        PathBuf::from("/bin"),
        PathBuf::from("/sbin"),
    ]
}

fn is_within_protected_dirs(resolved: &Path) -> bool {
    protected_dirs().iter().filter_map(|d| std::fs::canonicalize(d).ok()).any(|d| resolved.starts_with(&d))
}

/// Validates and resolves an absolute path that may not yet fully exist (e.g. a
/// download destination). Rejects relative paths, `..` traversal, and any path
/// inside an OS-core system directory. Symlinks in the existing portion of the
/// path are resolved.
pub fn confine_writable(target: &Path) -> Result<PathBuf, String> {
    if !target.is_absolute() {
        return Err("Path must be absolute".to_string());
    }
    let resolved = resolve_existing_prefix(target)?;
    if is_within_protected_dirs(&resolved) {
        log::warn!("[confine_writable] Path {:?} is inside a protected system directory — rejected", resolved);
        return Err("Path is inside a protected system directory".to_string());
    }
    log::info!("[confine_writable] Path {:?} resolved to {:?} — accepted", target, resolved);
    Ok(resolved)
}

/// Validates and canonicalizes a path that must already exist (e.g. a folder
/// selected by the picker). Rejects paths that do not exist and paths inside
/// OS-core system directories.
pub fn confine_writable_existing(target: &Path) -> Result<PathBuf, String> {
    let canonical = std::fs::canonicalize(target).map_err(|e| {
        log::warn!("[confine_writable_existing] Canonicalize failed for {:?}: kind={:?}, details={}", target, e.kind(), e);
        "Directory does not exist".to_string()
    })?;
    if is_within_protected_dirs(&canonical) {
        log::warn!("[confine_writable_existing] Path {:?} is inside a protected system directory — rejected", canonical);
        return Err("Path is inside a protected system directory".to_string());
    }
    log::info!("[confine_writable_existing] Canonical path: {:?} — accepted", canonical);
    Ok(canonical)
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
    fn confine_writable_allows_existing_dir() {
        let dir = tempdir().unwrap();
        assert!(confine_writable(dir.path()).is_ok());
    }

    #[test]
    fn confine_writable_allows_nonexistent_subdir() {
        let dir = tempdir().unwrap();
        let sub = dir.path().join("Music").join("New Album");
        assert!(confine_writable(&sub).is_ok());
    }

    #[test]
    fn confine_writable_rejects_relative_path() {
        assert!(confine_writable(Path::new("relative/dir")).is_err());
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    #[test]
    fn confine_writable_rejects_traversal_via_existing_prefix_into_protected_dir() {
        // /usr/local exists; canonicalize resolves the .. components to /usr, which is protected.
        let path = Path::new("/usr/local/../../../usr");
        assert!(confine_writable(path).is_err());
    }

    #[test]
    fn confine_writable_rejects_traversal_in_pending_tail() {
        let dir = tempdir().unwrap();
        let escape = dir.path().join("Missing").join("..").join("..").join("evil");
        assert!(confine_writable(&escape).is_err());
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    #[test]
    fn confine_writable_rejects_protected_dir() {
        assert!(confine_writable(Path::new("/usr")).is_err());
    }

    #[test]
    fn confine_writable_existing_rejects_nonexistent_path() {
        let dir = tempdir().unwrap();
        let missing = dir.path().join("does_not_exist");
        assert!(confine_writable_existing(&missing).is_err());
    }

    #[test]
    fn confine_writable_existing_accepts_existing_dir() {
        let dir = tempdir().unwrap();
        let result = confine_writable_existing(dir.path());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), std::fs::canonicalize(dir.path()).unwrap());
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    #[test]
    fn confine_writable_existing_rejects_protected_dir() {
        assert!(confine_writable_existing(Path::new("/usr")).is_err());
    }
}
