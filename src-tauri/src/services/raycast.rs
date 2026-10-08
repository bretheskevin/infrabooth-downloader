use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::services::remote;

const DISCOVERY_FILE_NAME: &str = "raycast.json";

#[derive(Default)]
pub struct LocalApiState {
    active: AtomicBool,
}

impl LocalApiState {
    pub fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }
}

#[derive(Serialize)]
struct Discovery<'a> {
    port: u16,
    token: &'a str,
}

#[cfg(any(target_os = "macos", test))]
fn find_raycast_app(applications_dir: &Path, home: &Path) -> Option<PathBuf> {
    let candidates = [applications_dir.join("Raycast.app"), home.join("Applications").join("Raycast.app")];
    for candidate in candidates {
        let exists = candidate.exists();
        log::info!("[raycast] checked {} -> {}", candidate.display(), if exists { "found" } else { "missing" });
        if exists {
            return Some(candidate);
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn detect_raycast() -> Option<PathBuf> {
    let Some(home) = dirs::home_dir() else {
        log::warn!("[raycast] home directory unavailable, skipping detection");
        return None;
    };
    let found = find_raycast_app(Path::new("/Applications"), &home);
    if found.is_none() {
        log::info!("[raycast] Raycast not installed, local API stays off");
    }
    found
}

#[cfg(not(target_os = "macos"))]
fn detect_raycast() -> Option<PathBuf> {
    log::info!("[raycast] local API is macOS-only, skipping");
    None
}

fn write_discovery_file(dir: &Path, port: u16, token: &str) -> io::Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let json = serde_json::to_vec(&Discovery { port, token }).map_err(io::Error::other)?;
    let mut temp = tempfile::NamedTempFile::new_in(dir)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        temp.as_file().set_permissions(std::fs::Permissions::from_mode(0o600))?;
    }
    temp.write_all(&json)?;
    temp.as_file().sync_all()?;
    let path = dir.join(DISCOVERY_FILE_NAME);
    temp.persist(&path).map_err(|e| e.error)?;
    Ok(path)
}

fn delete_discovery_file(dir: &Path) -> io::Result<bool> {
    match std::fs::remove_file(dir.join(DISCOVERY_FILE_NAME)) {
        Ok(()) => Ok(true),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e),
    }
}

pub fn remove_discovery_file(app: &AppHandle) {
    let dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => {
            log::error!("[raycast] app data dir unavailable, discovery file not removed: {e}");
            return;
        }
    };
    match delete_discovery_file(&dir) {
        Ok(true) => log::info!("[raycast] discovery file removed from {}", dir.display()),
        Ok(false) => log::debug!("[raycast] no discovery file to remove in {}", dir.display()),
        Err(e) => log::error!("[raycast] discovery file removal failed in {}: kind={:?} os_error={:?} {e}", dir.display(), e.kind(), e.raw_os_error()),
    }
}

pub fn init(app: &AppHandle) {
    let Some(raycast_path) = detect_raycast() else {
        return;
    };
    log::info!("[raycast] Raycast found at {}, starting local API", raycast_path.display());
    app.state::<LocalApiState>().active.store(true, Ordering::SeqCst);
    let app = app.clone();
    tauri::async_runtime::spawn(async move { launch(app).await });
}

async fn launch(app: AppHandle) {
    let token = remote::generate_token();
    let port = match remote::start_local_api(&app, token.clone()).await {
        Ok(port) => port,
        Err(e) => {
            log::error!("[raycast] local API failed to start: {e}");
            app.state::<LocalApiState>().active.store(false, Ordering::SeqCst);
            return;
        }
    };
    let dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => {
            log::error!("[raycast] app data dir unavailable, discovery file not written: {e}");
            return;
        }
    };
    let write_dir = dir.clone();
    match tokio::task::spawn_blocking(move || write_discovery_file(&write_dir, port, &token)).await {
        Ok(Ok(path)) => log::info!("[raycast] discovery file written to {} (port {port})", path.display()),
        Ok(Err(e)) => log::error!("[raycast] discovery file write failed in {}: kind={:?} os_error={:?} {e}", dir.display(), e.kind(), e.raw_os_error()),
        Err(e) => log::error!("[raycast] discovery file write task failed in {}: {e}", dir.display()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    type TestResult<T = ()> = Result<T, Box<dyn std::error::Error>>;

    fn read_discovery(path: &Path) -> TestResult<serde_json::Value> {
        Ok(serde_json::from_str(&std::fs::read_to_string(path)?)?)
    }

    #[test]
    fn finds_raycast_in_system_applications() -> TestResult {
        let apps = tempdir()?;
        let home = tempdir()?;
        std::fs::create_dir(apps.path().join("Raycast.app"))?;
        assert_eq!(find_raycast_app(apps.path(), home.path()), Some(apps.path().join("Raycast.app")));
        Ok(())
    }

    #[test]
    fn finds_raycast_in_user_applications() -> TestResult {
        let apps = tempdir()?;
        let home = tempdir()?;
        let user_app = home.path().join("Applications").join("Raycast.app");
        std::fs::create_dir_all(&user_app)?;
        assert_eq!(find_raycast_app(apps.path(), home.path()), Some(user_app));
        Ok(())
    }

    #[test]
    fn returns_none_when_raycast_missing() -> TestResult {
        let apps = tempdir()?;
        let home = tempdir()?;
        assert_eq!(find_raycast_app(apps.path(), home.path()), None);
        Ok(())
    }

    #[test]
    fn discovery_file_contains_port_and_token() -> TestResult {
        let dir = tempdir()?;
        let path = write_discovery_file(dir.path(), 4242, "secret")?;
        assert_eq!(path, dir.path().join(DISCOVERY_FILE_NAME));
        let value = read_discovery(&path)?;
        assert_eq!(value["port"], 4242);
        assert_eq!(value["token"], "secret");
        Ok(())
    }

    #[test]
    fn discovery_file_creates_missing_dir() -> TestResult {
        let dir = tempdir()?;
        let nested = dir.path().join("com.infrabooth.downloader");
        write_discovery_file(&nested, 1, "t")?;
        assert!(nested.join(DISCOVERY_FILE_NAME).exists());
        Ok(())
    }

    #[test]
    fn discovery_file_is_replaced_atomically_without_leftovers() -> TestResult {
        let dir = tempdir()?;
        write_discovery_file(dir.path(), 1, "old")?;
        let path = write_discovery_file(dir.path(), 2, "new")?;
        assert_eq!(read_discovery(&path)?["token"], "new");
        assert_eq!(std::fs::read_dir(dir.path())?.count(), 1);
        Ok(())
    }

    #[test]
    fn delete_discovery_file_removes_it_and_tolerates_absence() -> TestResult {
        let dir = tempdir()?;
        let path = write_discovery_file(dir.path(), 1, "t")?;
        assert!(delete_discovery_file(dir.path())?);
        assert!(!path.exists());
        assert!(!delete_discovery_file(dir.path())?);
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn discovery_file_is_owner_only() -> TestResult {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempdir()?;
        let path = write_discovery_file(dir.path(), 1, "t")?;
        assert_eq!(std::fs::metadata(path)?.permissions().mode() & 0o777, 0o600);
        Ok(())
    }
}
