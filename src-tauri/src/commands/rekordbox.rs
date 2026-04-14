use std::path::{Path, PathBuf};

use crate::models::error::{ErrorResponse, HasErrorCode, RekordboxError};
use crate::services::paths::get_app_data_dir;
use crate::services::rekordbox::models::{
    BackupInfo, ExportResult, ExportTrackRequest, RekordboxConfig, RekordboxPlaylistInfo, RekordboxStatus, ALL_TRACKS_PLAYLIST_NAME,
};
use crate::services::rekordbox::{
    backup, config, content,
    database::{self, timestamp_ms},
    file_manager, playlist, xml_sync,
};

#[cfg(test)]
#[path = "rekordbox_tests.rs"]
mod rekordbox_tests;

const MAX_REKORDBOX_BACKUPS: usize = 5;

fn app_data_dir_error(e: String) -> ErrorResponse {
    ErrorResponse { code: "APP_DATA_DIR_ERROR".to_string(), message: e }
}

fn resolve_rekordbox_config(manual_db_path: Option<String>) -> Result<RekordboxConfig, ErrorResponse> {
    config::detect_rekordbox(manual_db_path.map(PathBuf::from)).map_err(ErrorResponse::from)
}

fn is_content_in_playlist(db: &database::RekordboxDatabase, playlist_id: &str, content_id: &str) -> Result<bool, RekordboxError> {
    db.conn()
        .query_row(
            "SELECT COUNT(*) FROM djmdSongPlaylist WHERE PlaylistID = ?1 AND ContentID = ?2",
            rusqlite::params![playlist_id, content_id],
            |row| row.get::<_, i32>(0),
        )
        .map(|count| count > 0)
        .map_err(|e| {
            RekordboxError::DatabaseError(format!(
                "Failed to check whether content {} is already in playlist {}: {}",
                content_id, playlist_id, e
            ))
        })
}

fn restore_state_after_failure(err: RekordboxError, backup_path: &Path, db_dir: &Path) -> ErrorResponse {
    let code = err.code().to_string();

    match backup::restore_backup(backup_path, db_dir) {
        Ok(()) => ErrorResponse { code, message: format!("{} Original Rekordbox state was restored from backup.", err) },
        Err(restore_err) => ErrorResponse { code, message: format!("{} Automatic restore from backup also failed: {}", err, restore_err) },
    }
}

fn export_single_track(
    db: &mut database::RekordboxDatabase, track: &ExportTrackRequest, playlist_id: &str, rekordbox_tracks_dir: &Path,
) -> Result<bool, String> {
    let source = PathBuf::from(&track.source_path);

    let metadata = content::read_track_metadata(&source).map_err(|e| format!("{}: metadata error — {}", track.source_path, e))?;

    let dest = file_manager::copy_track_to_rekordbox(&source, &metadata.artist, &metadata.title, rekordbox_tracks_dir)
        .map_err(|e| format!("{}: copy failed — {}", track.source_path, e))?;

    let content_id = content::add_content(db, &dest, &metadata).map_err(|e| format!("{}: db insert failed — {}", track.source_path, e))?;

    if is_content_in_playlist(db, playlist_id, &content_id).map_err(|e| format!("{}: playlist lookup failed — {}", track.source_path, e))?
    {
        return Ok(false);
    }

    playlist::add_to_playlist(db, playlist_id, &content_id, None)
        .map_err(|e| format!("{}: add to playlist failed — {}", track.source_path, e))?;

    Ok(true)
}

#[tauri::command]
#[specta::specta]
pub fn detect_rekordbox(manual_db_path: Option<String>, _app: tauri::AppHandle) -> Result<RekordboxStatus, ErrorResponse> {
    let is_running = config::is_rekordbox_running();
    let manual_db_path = manual_db_path.map(PathBuf::from);

    match config::detect_rekordbox(manual_db_path) {
        Ok(cfg) => Ok(RekordboxStatus {
            found: true,
            version: Some(cfg.version),
            db_path: Some(cfg.db_path.to_string_lossy().to_string()),
            is_running,
        }),
        Err(RekordboxError::NotFound(_)) => Ok(RekordboxStatus { found: false, version: None, db_path: None, is_running }),
        Err(e) => Err(ErrorResponse::from(e)),
    }
}

#[tauri::command]
#[specta::specta]
pub fn get_default_rekordbox_data_directory_parent(_app: tauri::AppHandle) -> Result<String, String> {
    config::default_rekordbox_data_directory_parent().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn export_to_rekordbox(
    tracks: Vec<ExportTrackRequest>, playlist_name: Option<String>, manual_db_path: Option<String>, app: tauri::AppHandle,
) -> Result<ExportResult, ErrorResponse> {
    let rb_config = resolve_rekordbox_config(manual_db_path)?;

    if config::is_rekordbox_running() {
        return Err(ErrorResponse::from(RekordboxError::RekordboxRunning));
    }

    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;

    let backup_path = backup::create_backup(&rb_config.db_dir, &app_data_dir).map_err(ErrorResponse::from)?;
    backup::rotate_backups(&app_data_dir, MAX_REKORDBOX_BACKUPS).map_err(ErrorResponse::from)?;

    let result = (|| -> Result<ExportResult, RekordboxError> {
        let mut db = database::RekordboxDatabase::open(&rb_config)?;
        let mut xml = xml_sync::PlaylistXml::read_if_exists(&rb_config.db_dir)?;

        let folder = playlist::find_or_create_infrabooth_folder(&mut db)?;
        if let Some(ref mut x) = xml {
            x.add_playlist(&folder.id, "root", 1, timestamp_ms());
        }

        let target_playlist_name = playlist_name.as_deref().unwrap_or(ALL_TRACKS_PLAYLIST_NAME);
        let pl = match playlist::find_playlist_by_name(&db, target_playlist_name, &folder.id) {
            Some(existing) => existing,
            None => playlist::create_playlist(&mut db, target_playlist_name, &folder.id)?,
        };
        if let Some(ref mut x) = xml {
            x.add_playlist(&pl.id, &folder.id, 0, timestamp_ms());
        }

        let rekordbox_tracks_dir = file_manager::get_rekordbox_tracks_dir(&app_data_dir);
        let mut exported_count = 0i32;
        let mut skipped_count = 0i32;
        let mut errors: Vec<String> = Vec::new();

        for track in &tracks {
            match export_single_track(&mut db, track, &pl.id, &rekordbox_tracks_dir) {
                Ok(true) => exported_count += 1,
                Ok(false) => skipped_count += 1,
                Err(e) => errors.push(e),
            }
        }

        if let Some(ref x) = xml {
            x.save(&rb_config.db_dir)?;
        }
        db.flush_usn_and_commit()?;

        Ok(ExportResult { exported_count, skipped_count, playlist_name: pl.name, errors })
    })();

    result.map_err(|err| restore_state_after_failure(err, &backup_path, &rb_config.db_dir))
}

#[tauri::command]
#[specta::specta]
pub fn list_rekordbox_playlists(
    manual_db_path: Option<String>, _app: tauri::AppHandle,
) -> Result<Vec<RekordboxPlaylistInfo>, ErrorResponse> {
    let rb_config = resolve_rekordbox_config(manual_db_path)?;
    let db = database::RekordboxDatabase::open(&rb_config).map_err(ErrorResponse::from)?;

    let folder = match playlist::find_infrabooth_folder(&db) {
        Some(f) => f,
        None => return Ok(Vec::new()),
    };

    let playlists = playlist::list_playlists_in_folder(&db, &folder.id).map_err(ErrorResponse::from)?;

    let result = playlists
        .into_iter()
        .map(|pl| {
            let track_count = playlist::count_playlist_songs(&db, &pl.id)?;
            Ok(RekordboxPlaylistInfo { id: pl.id, name: pl.name, track_count })
        })
        .collect::<Result<Vec<_>, RekordboxError>>()
        .map_err(ErrorResponse::from)?;

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub fn delete_rekordbox_playlist(playlist_id: String, manual_db_path: Option<String>, app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    if config::is_rekordbox_running() {
        return Err(ErrorResponse::from(RekordboxError::RekordboxRunning));
    }

    let rb_config = resolve_rekordbox_config(manual_db_path)?;
    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;

    let backup_path = backup::create_backup(&rb_config.db_dir, &app_data_dir).map_err(ErrorResponse::from)?;
    backup::rotate_backups(&app_data_dir, MAX_REKORDBOX_BACKUPS).map_err(ErrorResponse::from)?;

    let result = (|| -> Result<(), RekordboxError> {
        let mut db = database::RekordboxDatabase::open(&rb_config)?;
        let mut xml = xml_sync::PlaylistXml::read_if_exists(&rb_config.db_dir)?;

        let folder = playlist::find_infrabooth_folder(&db).ok_or_else(|| RekordboxError::NotFound("InfraBooth folder not found".into()))?;
        let target = playlist::find_playlist_in_folder(&db, &playlist_id, &folder.id).ok_or_else(|| {
            let target_type = playlist::find_playlist_by_id(&db, &playlist_id)
                .map(|pl| {
                    if pl.attribute == 1 {
                        "folder"
                    } else {
                        "playlist outside the InfraBooth folder"
                    }
                })
                .unwrap_or("unknown playlist");
            RekordboxError::InvalidPlaylist(format!("Refusing to delete {} with ID {}", target_type, playlist_id))
        })?;

        playlist::delete_playlist(&mut db, &target.id)?;

        if let Some(ref mut playlist_xml) = xml {
            playlist_xml.remove_playlist(&target.id)?;
            playlist_xml.save(&rb_config.db_dir)?;
        }

        db.flush_usn_and_commit()?;
        Ok(())
    })();

    result.map_err(|err| restore_state_after_failure(err, &backup_path, &rb_config.db_dir))
}

#[tauri::command]
#[specta::specta]
pub fn list_rekordbox_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, ErrorResponse> {
    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;
    backup::list_backups(&app_data_dir).map_err(ErrorResponse::from)
}

#[tauri::command]
#[specta::specta]
pub fn restore_rekordbox_backup(backup_path: String, manual_db_path: Option<String>, app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    if config::is_rekordbox_running() {
        return Err(ErrorResponse::from(RekordboxError::RekordboxRunning));
    }

    let rb_config = resolve_rekordbox_config(manual_db_path)?;

    let path = std::fs::canonicalize(&backup_path)
        .map_err(|e| ErrorResponse::from(RekordboxError::RestoreFailed(format!("Invalid backup path: {}", e))))?;

    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;
    let backups_dir = std::fs::canonicalize(app_data_dir.join(backup::BACKUPS_DIR_NAME))
        .map_err(|e| ErrorResponse::from(RekordboxError::RestoreFailed(format!("Backups dir error: {}", e))))?;

    if !path.starts_with(&backups_dir) {
        return Err(ErrorResponse::from(RekordboxError::RestoreFailed(
            "Backup path is outside the backups directory".into(),
        )));
    }

    backup::restore_backup(&path, &rb_config.db_dir).map_err(ErrorResponse::from)
}
