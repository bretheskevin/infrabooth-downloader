use std::path::{Path, PathBuf};

use crate::models::error::{ErrorResponse, RekordboxError};
use crate::services::paths::get_app_data_dir;
use crate::services::rekordbox::{backup, config, content, database::{self, timestamp_ms}, file_manager, playlist, xml_sync};
use crate::services::rekordbox::models::{
    ALL_TRACKS_PLAYLIST_NAME, BackupInfo, ExportResult, ExportTrackRequest, RekordboxPlaylistInfo,
    RekordboxStatus,
};

const MAX_REKORDBOX_BACKUPS: usize = 5;

fn app_data_dir_error(e: String) -> ErrorResponse {
    ErrorResponse { code: "APP_DATA_DIR_ERROR".to_string(), message: e }
}

fn is_content_in_playlist(
    db: &database::RekordboxDatabase,
    playlist_id: &str,
    content_id: &str,
) -> bool {
    db.conn()
        .query_row(
            "SELECT COUNT(*) FROM djmdSongPlaylist WHERE PlaylistID = ?1 AND ContentID = ?2",
            rusqlite::params![playlist_id, content_id],
            |row| row.get::<_, i32>(0),
        )
        .unwrap_or(0)
        > 0
}

fn export_single_track(
    db: &mut database::RekordboxDatabase,
    track: &ExportTrackRequest,
    playlist_id: &str,
    rekordbox_tracks_dir: &Path,
) -> Result<bool, String> {
    let source = PathBuf::from(&track.source_path);

    let metadata = content::read_track_metadata(&source)
        .map_err(|e| format!("{}: metadata error — {}", track.source_path, e))?;

    let dest = file_manager::copy_track_to_rekordbox(
        &source, &metadata.artist, &metadata.title, rekordbox_tracks_dir,
    )
    .map_err(|e| format!("{}: copy failed — {}", track.source_path, e))?;

    let content_id = content::add_content(db, &dest, &metadata)
        .map_err(|e| format!("{}: db insert failed — {}", track.source_path, e))?;

    if is_content_in_playlist(db, playlist_id, &content_id) {
        return Ok(false);
    }

    playlist::add_to_playlist(db, playlist_id, &content_id, None)
        .map_err(|e| format!("{}: add to playlist failed — {}", track.source_path, e))?;

    Ok(true)
}

#[tauri::command]
#[specta::specta]
pub fn detect_rekordbox(_app: tauri::AppHandle) -> Result<RekordboxStatus, ErrorResponse> {
    let is_running = config::is_rekordbox_running();
    match config::detect_rekordbox(None) {
        Ok(cfg) => Ok(RekordboxStatus {
            found: true,
            version: Some(cfg.version),
            db_path: Some(cfg.db_path.to_string_lossy().to_string()),
            is_running,
        }),
        Err(RekordboxError::NotFound(_)) => Ok(RekordboxStatus {
            found: false,
            version: None,
            db_path: None,
            is_running,
        }),
        Err(e) => Err(ErrorResponse::from(e)),
    }
}

#[tauri::command]
#[specta::specta]
pub fn export_to_rekordbox(
    tracks: Vec<ExportTrackRequest>,
    playlist_name: Option<String>,
    app: tauri::AppHandle,
) -> Result<ExportResult, ErrorResponse> {
    let rb_config = config::detect_rekordbox(None).map_err(ErrorResponse::from)?;

    if config::is_rekordbox_running() {
        return Err(ErrorResponse::from(RekordboxError::RekordboxRunning));
    }

    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;

    backup::create_backup(&rb_config.db_dir, &app_data_dir).map_err(ErrorResponse::from)?;
    backup::rotate_backups(&app_data_dir, MAX_REKORDBOX_BACKUPS).map_err(ErrorResponse::from)?;

    let mut db = database::RekordboxDatabase::open(&rb_config).map_err(ErrorResponse::from)?;
    let mut xml = xml_sync::PlaylistXml::read(&rb_config.db_dir).ok();

    let folder = playlist::find_or_create_infrabooth_folder(&mut db).map_err(ErrorResponse::from)?;
    if let Some(ref mut x) = xml {
        x.add_playlist(&folder.id, "root", 1, timestamp_ms());
    }

    let target_playlist_name = playlist_name.as_deref().unwrap_or(ALL_TRACKS_PLAYLIST_NAME);
    let pl = match playlist::find_playlist_by_name(&db, target_playlist_name, &folder.id) {
        Some(existing) => existing,
        None => playlist::create_playlist(&mut db, target_playlist_name, &folder.id)
            .map_err(ErrorResponse::from)?,
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
        x.save(&rb_config.db_dir).map_err(ErrorResponse::from)?;
    }
    db.flush_usn_and_commit().map_err(ErrorResponse::from)?;

    Ok(ExportResult { exported_count, skipped_count, playlist_name: pl.name, errors })
}

#[tauri::command]
#[specta::specta]
pub fn list_rekordbox_playlists(
    _app: tauri::AppHandle,
) -> Result<Vec<RekordboxPlaylistInfo>, ErrorResponse> {
    let rb_config = config::detect_rekordbox(None).map_err(ErrorResponse::from)?;
    let db = database::RekordboxDatabase::open(&rb_config).map_err(ErrorResponse::from)?;

    let folder = match playlist::find_infrabooth_folder(&db) {
        Some(f) => f,
        None => return Ok(Vec::new()),
    };

    let playlists =
        playlist::list_playlists_in_folder(&db, &folder.id).map_err(ErrorResponse::from)?;

    let result = playlists
        .into_iter()
        .map(|pl| {
            let track_count = playlist::count_playlist_songs(&db, &pl.id).unwrap_or(0);
            RekordboxPlaylistInfo { id: pl.id, name: pl.name, track_count }
        })
        .collect();

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub fn delete_rekordbox_playlist(
    playlist_id: String,
    app: tauri::AppHandle,
) -> Result<(), ErrorResponse> {
    if config::is_rekordbox_running() {
        return Err(ErrorResponse::from(RekordboxError::RekordboxRunning));
    }

    let rb_config = config::detect_rekordbox(None).map_err(ErrorResponse::from)?;
    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;

    backup::create_backup(&rb_config.db_dir, &app_data_dir).map_err(ErrorResponse::from)?;
    backup::rotate_backups(&app_data_dir, MAX_REKORDBOX_BACKUPS).map_err(ErrorResponse::from)?;

    let mut db = database::RekordboxDatabase::open(&rb_config).map_err(ErrorResponse::from)?;

    playlist::delete_playlist(&mut db, &playlist_id).map_err(ErrorResponse::from)?;

    if let Ok(mut xml) = xml_sync::PlaylistXml::read(&rb_config.db_dir) {
        let _ = xml.remove_playlist(&playlist_id);
        xml.save(&rb_config.db_dir).map_err(ErrorResponse::from)?;
    }

    db.flush_usn_and_commit().map_err(ErrorResponse::from)?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn list_rekordbox_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, ErrorResponse> {
    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;
    backup::list_backups(&app_data_dir).map_err(ErrorResponse::from)
}

#[tauri::command]
#[specta::specta]
pub fn restore_rekordbox_backup(
    backup_path: String,
    app: tauri::AppHandle,
) -> Result<(), ErrorResponse> {
    if config::is_rekordbox_running() {
        return Err(ErrorResponse::from(RekordboxError::RekordboxRunning));
    }

    let rb_config = config::detect_rekordbox(None).map_err(ErrorResponse::from)?;

    let path = std::fs::canonicalize(&backup_path).map_err(|e| {
        ErrorResponse::from(RekordboxError::RestoreFailed(format!("Invalid backup path: {}", e)))
    })?;

    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;
    let backups_dir = std::fs::canonicalize(app_data_dir.join("rekordbox-backups")).map_err(|e| {
        ErrorResponse::from(RekordboxError::RestoreFailed(format!("Backups dir error: {}", e)))
    })?;

    if !path.starts_with(&backups_dir) {
        return Err(ErrorResponse::from(RekordboxError::RestoreFailed(
            "Backup path is outside the backups directory".into(),
        )));
    }

    backup::restore_backup(&path, &rb_config.db_dir).map_err(ErrorResponse::from)
}
