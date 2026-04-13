use std::path::{Path, PathBuf};

use sysinfo::{ProcessesToUpdate, System};

use super::models::RekordboxConfig;
use crate::models::error::RekordboxError;

// Well-known SQLCipher key for Rekordbox 6 databases — same for all installations,
// publicly documented by the community. Not a per-user secret.
const DB_KEY: &str = "402fd482c38817c35ffa8ffb8c7d93143b749e7d315df7a81732a1ff43608497";

pub fn db_key() -> &'static str {
    DB_KEY
}

pub fn is_rekordbox_running() -> bool {
    let mut s = System::new();
    s.refresh_processes(ProcessesToUpdate::All, true);
    s.processes().values().any(|p| {
        let name = p.name().to_string_lossy().to_lowercase();
        name.contains("rekordbox") && !name.contains("rekordboxagent")
    })
}

pub fn detect_rekordbox(manual_db_path: Option<PathBuf>) -> Result<RekordboxConfig, RekordboxError> {
    if let Some(path) = manual_db_path {
        return validate_db_path(path);
    }

    let pioneer_app_dir = get_pioneer_app_dir().map_err(RekordboxError::NotFound)?;

    if let Ok(config) = detect_from_options_json(&pioneer_app_dir) {
        return Ok(config);
    }

    if let Ok(config) = detect_from_settings_file(&pioneer_app_dir) {
        return Ok(config);
    }

    Err(RekordboxError::NotFound(
        "Could not find Rekordbox installation. Set the database path manually in Settings.".into(),
    ))
}

fn get_pioneer_app_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "Cannot determine home directory".to_string())?;
        let path = PathBuf::from(home).join("Library/Application Support/Pioneer");
        if path.exists() {
            Ok(path)
        } else {
            Err(format!("Pioneer app directory not found: {}", path.display()))
        }
    }
    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var("APPDATA").map_err(|_| "APPDATA environment variable not set".to_string())?;
        let path = PathBuf::from(app_data).join("Pioneer");
        if path.exists() {
            Ok(path)
        } else {
            Err(format!("Pioneer app directory not found: {}", path.display()))
        }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Rekordbox is only supported on macOS and Windows".into())
    }
}

fn detect_from_options_json(pioneer_app_dir: &Path) -> Result<RekordboxConfig, RekordboxError> {
    let options_path = pioneer_app_dir.join("rekordboxAgent").join("storage").join("options.json");

    if !options_path.exists() {
        return Err(RekordboxError::NotFound("options.json not found".into()));
    }

    let content =
        std::fs::read_to_string(&options_path).map_err(|e| RekordboxError::NotFound(format!("Cannot read options.json: {}", e)))?;

    let data: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| RekordboxError::NotFound(format!("Invalid options.json: {}", e)))?;

    let options = data["options"]
        .as_array()
        .ok_or_else(|| RekordboxError::NotFound("options.json missing 'options' array".into()))?;

    let db_path_str = options
        .iter()
        .find_map(|opt| {
            let arr = opt.as_array()?;
            if arr.len() == 2 && arr[0].as_str() == Some("db-path") {
                arr[1].as_str().map(String::from)
            } else {
                None
            }
        })
        .ok_or_else(|| RekordboxError::NotFound("db-path not found in options.json".into()))?;

    validate_db_path(PathBuf::from(&db_path_str))
}

fn detect_from_settings_file(pioneer_app_dir: &Path) -> Result<RekordboxConfig, RekordboxError> {
    let settings_path = pioneer_app_dir.join("rekordbox6").join("rekordbox3.settings");

    if !settings_path.exists() {
        return Err(RekordboxError::NotFound("rekordbox3.settings not found".into()));
    }

    let content = std::fs::read_to_string(&settings_path).map_err(|e| RekordboxError::NotFound(format!("Cannot read settings: {}", e)))?;

    let db_dir_str = content
        .lines()
        .find_map(|line| {
            if line.contains("name=\"masterDbDirectory\"") {
                let start = line.find("val=\"")? + 5;
                let end = line[start..].find('"')? + start;
                Some(line[start..end].to_string())
            } else {
                None
            }
        })
        .ok_or_else(|| RekordboxError::NotFound("masterDbDirectory not found in settings".into()))?;

    validate_db_path(PathBuf::from(&db_dir_str).join("master.db"))
}

fn validate_db_path(db_path: PathBuf) -> Result<RekordboxConfig, RekordboxError> {
    if !db_path.exists() {
        return Err(RekordboxError::NotFound(format!("Database file not found: {}", db_path.display())));
    }

    let db_dir = db_path
        .parent()
        .ok_or_else(|| RekordboxError::NotFound("Cannot determine database directory".into()))?
        .to_path_buf();

    let version = "6".to_string();

    Ok(RekordboxConfig { db_path, db_dir, version })
}
