use std::fs;
use std::path::{Path, PathBuf};

use crate::models::error::RekordboxError;

use super::models::{BackupInfo, MASTER_DB_FILENAME, MASTER_PLAYLISTS_XML};

pub(crate) const BACKUPS_DIR_NAME: &str = "rekordbox-backups";

fn build_backup_path(backups_dir: &Path) -> Result<PathBuf, RekordboxError> {
    let now = time::OffsetDateTime::now_utc();
    let timestamp = format!(
        "{:04}-{:02}-{:02}_{:02}{:02}{:02}_{:03}",
        now.year(),
        now.month() as u8,
        now.day(),
        now.hour(),
        now.minute(),
        now.second(),
        now.millisecond()
    );

    let primary = backups_dir.join(&timestamp);
    if !primary.exists() {
        return Ok(primary);
    }

    for suffix in 1..=999 {
        let candidate = backups_dir.join(format!("{}_{:02}", timestamp, suffix));
        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(RekordboxError::BackupFailed("Could not allocate a unique backup directory".into()))
}

pub fn create_backup(db_dir: &Path, app_data_dir: &Path) -> Result<PathBuf, RekordboxError> {
    let backups_dir = app_data_dir.join(BACKUPS_DIR_NAME);
    fs::create_dir_all(&backups_dir).map_err(|e| RekordboxError::BackupFailed(format!("Cannot create backups dir: {}", e)))?;

    let backup_path = build_backup_path(&backups_dir)?;
    fs::create_dir_all(&backup_path).map_err(|e| RekordboxError::BackupFailed(format!("Cannot create backup dir: {}", e)))?;

    let db_file = db_dir.join(MASTER_DB_FILENAME);
    let xml_file = db_dir.join(MASTER_PLAYLISTS_XML);

    if db_file.exists() {
        fs::copy(&db_file, backup_path.join(MASTER_DB_FILENAME))
            .map_err(|e| RekordboxError::BackupFailed(format!("Cannot copy master.db: {}", e)))?;
    } else {
        return Err(RekordboxError::BackupFailed("master.db not found in database directory".into()));
    }

    if xml_file.exists() {
        fs::copy(&xml_file, backup_path.join(MASTER_PLAYLISTS_XML))
            .map_err(|e| RekordboxError::BackupFailed(format!("Cannot copy XML: {}", e)))?;
    }

    log::info!("Backup created: {}", backup_path.display());
    Ok(backup_path)
}

pub fn rotate_backups(app_data_dir: &Path, max_backups: usize) -> Result<(), RekordboxError> {
    let backups_dir = app_data_dir.join(BACKUPS_DIR_NAME);
    if !backups_dir.exists() {
        return Ok(());
    }

    let mut entries: Vec<PathBuf> = fs::read_dir(&backups_dir)
        .map_err(|e| RekordboxError::BackupFailed(format!("Cannot read backups dir: {}", e)))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .map(|e| e.path())
        .collect();

    entries.sort();

    while entries.len() > max_backups {
        let oldest = entries.remove(0);
        fs::remove_dir_all(&oldest)
            .map_err(|e| RekordboxError::BackupFailed(format!("Cannot remove old backup {}: {}", oldest.display(), e)))?;
        log::info!("Removed old backup: {}", oldest.display());
    }

    Ok(())
}

pub fn restore_backup(backup_path: &Path, db_dir: &Path) -> Result<(), RekordboxError> {
    let db_backup = backup_path.join(MASTER_DB_FILENAME);
    let xml_backup = backup_path.join(MASTER_PLAYLISTS_XML);

    if !db_backup.exists() {
        return Err(RekordboxError::RestoreFailed("Backup does not contain master.db".into()));
    }

    fs::copy(&db_backup, db_dir.join(MASTER_DB_FILENAME))
        .map_err(|e| RekordboxError::RestoreFailed(format!("Cannot restore master.db: {}", e)))?;

    if xml_backup.exists() {
        fs::copy(&xml_backup, db_dir.join(MASTER_PLAYLISTS_XML))
            .map_err(|e| RekordboxError::RestoreFailed(format!("Cannot restore XML: {}", e)))?;
    } else {
        let xml_target = db_dir.join(MASTER_PLAYLISTS_XML);
        if xml_target.exists() {
            fs::remove_file(&xml_target).map_err(|e| RekordboxError::RestoreFailed(format!("Cannot remove XML during restore: {}", e)))?;
        }
    }

    log::info!("Backup restored from: {}", backup_path.display());
    Ok(())
}

pub fn list_backups(app_data_dir: &Path) -> Result<Vec<BackupInfo>, RekordboxError> {
    let backups_dir = app_data_dir.join(BACKUPS_DIR_NAME);
    if !backups_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups: Vec<BackupInfo> = fs::read_dir(&backups_dir)
        .map_err(|e| RekordboxError::BackupFailed(format!("Cannot read backups dir: {}", e)))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter_map(|e| {
            let path = e.path();
            let timestamp = path.file_name()?.to_string_lossy().to_string();
            let db_file = path.join(MASTER_DB_FILENAME);
            let size_bytes = db_file.metadata().ok()?.len();
            let xml_file = path.join(MASTER_PLAYLISTS_XML);
            let xml_size = xml_file.metadata().map(|m| m.len()).unwrap_or(0);
            let total_mb = (size_bytes + xml_size) as f64 / (1024.0 * 1024.0);
            Some(BackupInfo { path: path.to_string_lossy().to_string(), timestamp, size_mb: (total_mb * 100.0).round() / 100.0 })
        })
        .collect();

    backups.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
    Ok(backups)
}
