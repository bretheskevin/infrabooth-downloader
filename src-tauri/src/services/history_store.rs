use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::{Path, PathBuf};

const HISTORY_FILE: &str = "download_history.json";

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadHistoryEntry {
    pub id: String,
    pub title: String,
    pub kind: DownloadHistoryKind,
    pub artwork_url: Option<String>,
    pub dest_dir: Option<String>,
    pub ok_count: u32,
    pub failed_count: u32,
    pub cancelled: bool,
    pub completed_at: i64,
    pub tracks: Vec<DownloadHistoryTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum DownloadHistoryKind {
    Track,
    Playlist,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadHistoryTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub status: String,
    pub reason: Option<String>,
}

fn history_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(HISTORY_FILE)
}

pub fn load_history(app_data_dir: &Path) -> Vec<DownloadHistoryEntry> {
    let path = history_path(app_data_dir);
    if !path.exists() {
        return Vec::new();
    }
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|e| {
            log::warn!("[history] Failed to parse {}: {}", path.display(), e);
            Vec::new()
        }),
        Err(e) => {
            log::warn!("[history] Failed to read {}: {}", path.display(), e);
            Vec::new()
        }
    }
}

pub fn save_history(app_data_dir: &Path, entries: &[DownloadHistoryEntry]) -> Result<(), String> {
    let path = history_path(app_data_dir);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(entries).map_err(|e| format!("Failed to serialize history: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write history: {}", e))?;
    Ok(())
}

pub fn append_entry(app_data_dir: &Path, entry: DownloadHistoryEntry) -> Result<(), String> {
    let mut entries = load_history(app_data_dir);
    entries.insert(0, entry);
    save_history(app_data_dir, &entries)
}

pub fn remove_entry(app_data_dir: &Path, id: &str) -> Result<(), String> {
    let mut entries = load_history(app_data_dir);
    entries.retain(|e| e.id != id);
    save_history(app_data_dir, &entries)
}

pub fn clear_history(app_data_dir: &Path) -> Result<(), String> {
    save_history(app_data_dir, &[])
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn sample_entry(id: &str, title: &str) -> DownloadHistoryEntry {
        DownloadHistoryEntry {
            id: id.to_string(),
            title: title.to_string(),
            kind: DownloadHistoryKind::Track,
            artwork_url: None,
            dest_dir: Some("/downloads".to_string()),
            ok_count: 1,
            failed_count: 0,
            cancelled: false,
            completed_at: 1720000000000,
            tracks: vec![DownloadHistoryTrack {
                id: "t1".to_string(),
                title: "Track 1".to_string(),
                artist: "Artist".to_string(),
                status: "complete".to_string(),
                reason: None,
            }],
        }
    }

    #[test]
    fn load_returns_empty_for_missing_file() {
        let dir = TempDir::new().unwrap();
        let entries = load_history(dir.path());
        assert!(entries.is_empty());
    }

    #[test]
    fn load_returns_empty_for_corrupt_file() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join(HISTORY_FILE), "not json").unwrap();
        let entries = load_history(dir.path());
        assert!(entries.is_empty());
    }

    #[test]
    fn append_and_load_round_trips() {
        let dir = TempDir::new().unwrap();
        append_entry(dir.path(), sample_entry("a", "First")).unwrap();
        append_entry(dir.path(), sample_entry("b", "Second")).unwrap();
        let entries = load_history(dir.path());
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].id, "b");
        assert_eq!(entries[1].id, "a");
    }

    #[test]
    fn remove_entry_by_id() {
        let dir = TempDir::new().unwrap();
        append_entry(dir.path(), sample_entry("a", "First")).unwrap();
        append_entry(dir.path(), sample_entry("b", "Second")).unwrap();
        remove_entry(dir.path(), "a").unwrap();
        let entries = load_history(dir.path());
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "b");
    }

    #[test]
    fn clear_removes_all() {
        let dir = TempDir::new().unwrap();
        append_entry(dir.path(), sample_entry("a", "First")).unwrap();
        clear_history(dir.path()).unwrap();
        let entries = load_history(dir.path());
        assert!(entries.is_empty());
    }
}
