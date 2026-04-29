use std::path::{Path, PathBuf};

use crate::models::error::{ErrorResponse, HasErrorCode, RekordboxError};
use crate::services::paths::get_app_data_dir;
use crate::services::rekordbox::models::{
    BackupInfo, BackupKind, DjmdPlaylist, ExportResult, ExportTrackRequest, RekordboxConfig, RekordboxPlaylistInfo, RekordboxStatus, RekordboxTreeNode,
    ALL_TRACKS_PLAYLIST_NAME,
};
use crate::services::rekordbox::{
    backup, config, content,
    database::{self, timestamp_ms},
    file_manager, playlist, xml_sync,
};

#[cfg(test)]
#[path = "rekordbox_tests.rs"]
mod rekordbox_tests;

const MAX_REKORDBOX_BACKUPS: usize = 10;

pub(super) fn app_data_dir_error(e: String) -> ErrorResponse {
    ErrorResponse { code: "APP_DATA_DIR_ERROR".to_string(), message: e }
}

pub(super) fn create_backup_and_rotate(db_dir: &Path, app_data_dir: &Path, kind: BackupKind) -> Result<PathBuf, ErrorResponse> {
    let backup_path = backup::create_backup(db_dir, app_data_dir, kind).map_err(ErrorResponse::from)?;
    backup::rotate_backups(app_data_dir, MAX_REKORDBOX_BACKUPS).map_err(ErrorResponse::from)?;
    Ok(backup_path)
}

pub(super) fn resolve_rekordbox_config(manual_db_path: Option<String>) -> Result<RekordboxConfig, ErrorResponse> {
    config::detect_rekordbox(manual_db_path.map(PathBuf::from)).map_err(ErrorResponse::from)
}

pub(super) fn is_content_in_playlist(db: &database::RekordboxDatabase, playlist_id: &str, content_id: &str) -> Result<bool, RekordboxError> {
    db.conn()
        .query_row("SELECT COUNT(*) FROM djmdSongPlaylist WHERE PlaylistID = ?1 AND ContentID = ?2", rusqlite::params![playlist_id, content_id], |row| {
            row.get::<_, i32>(0)
        })
        .map(|count| count > 0)
        .map_err(|e| RekordboxError::DatabaseError(format!("Failed to check whether content {} is already in playlist {}: {}", content_id, playlist_id, e)))
}

fn restore_state_after_failure(err: RekordboxError, backup_path: &Path, db_dir: &Path) -> ErrorResponse {
    let code = err.code().to_string();

    match backup::restore_backup(backup_path, db_dir) {
        Ok(()) => ErrorResponse { code, message: format!("{} Original Rekordbox state was restored from backup.", err) },
        Err(restore_err) => ErrorResponse { code, message: format!("{} Automatic restore from backup also failed: {}", err, restore_err) },
    }
}

pub(super) struct RekordboxWriteContext {
    pub rb_config: RekordboxConfig,
    pub app_data_dir: PathBuf,
    backup_path: PathBuf,
}

impl RekordboxWriteContext {
    pub fn prepare(manual_db_path: Option<String>, app: &tauri::AppHandle) -> Result<Self, ErrorResponse> {
        log::info!("[rekordbox] RekordboxWriteContext::prepare starting...");
        let rb_config = resolve_rekordbox_config(manual_db_path)?;
        log::info!("[rekordbox] Rekordbox config resolved: db_path={:?}", rb_config.db_path);

        if config::is_rekordbox_running() {
            log::warn!("[rekordbox] Rekordbox is running, aborting");
            return Err(ErrorResponse::from(RekordboxError::RekordboxRunning));
        }
        log::info!("[rekordbox] Rekordbox is not running, proceeding");

        let app_data_dir = get_app_data_dir(app).map_err(app_data_dir_error)?;
        log::info!("[rekordbox] App data dir: {:?}", app_data_dir);

        log::info!("[rekordbox] Creating backup...");
        let backup_path = create_backup_and_rotate(&rb_config.db_dir, &app_data_dir, BackupKind::Export)?;
        log::info!("[rekordbox] Backup created: {:?}", backup_path);

        Ok(Self { rb_config, app_data_dir, backup_path })
    }

    pub fn open_session(&self) -> Result<RekordboxSession, RekordboxError> {
        log::info!("[rekordbox] Opening database: {:?}", self.rb_config.db_path);
        let db = database::RekordboxDatabase::open(&self.rb_config)?;
        log::info!("[rekordbox] Database opened successfully");

        log::info!("[rekordbox] Reading XML playlist file...");
        let xml = xml_sync::PlaylistXml::read_if_exists(&self.rb_config.db_dir)?;
        log::info!("[rekordbox] XML playlist file: {}", if xml.is_some() { "found" } else { "not found" });

        Ok(RekordboxSession { db, xml, db_dir: self.rb_config.db_dir.clone() })
    }

    pub fn handle_result<T>(&self, result: Result<T, RekordboxError>) -> Result<T, ErrorResponse> {
        result.map_err(|err| {
            log::error!("[rekordbox] Operation failed: {}, attempting restore from backup", err);
            restore_state_after_failure(err, &self.backup_path, &self.rb_config.db_dir)
        })
    }
}

pub(super) struct RekordboxSession {
    pub db: database::RekordboxDatabase,
    pub xml: Option<xml_sync::PlaylistXml>,
    db_dir: PathBuf,
}

impl RekordboxSession {
    pub fn init_infrabooth_folder(&mut self) -> Result<DjmdPlaylist, RekordboxError> {
        log::debug!("[rekordbox] Finding or creating InfraBooth folder...");
        let folder = playlist::find_or_create_infrabooth_folder(&mut self.db)?;
        log::debug!("[rekordbox] InfraBooth folder: id={}", folder.id);
        if let Some(ref mut x) = self.xml {
            x.add_playlist(&folder.id, "root", 1, timestamp_ms());
        }
        Ok(folder)
    }

    pub fn find_or_create_playlist(&mut self, name: &str, folder_id: &str) -> Result<DjmdPlaylist, RekordboxError> {
        log::debug!("[rekordbox] Finding or creating playlist '{}' in folder {}...", name, folder_id);
        let pl = match playlist::find_playlist_by_name(&self.db, name, folder_id) {
            Some(existing) => {
                log::debug!("[rekordbox] Found existing playlist: id={}", existing.id);
                existing
            }
            None => {
                log::debug!("[rekordbox] Creating new playlist...");
                playlist::create_playlist(&mut self.db, name, folder_id)?
            }
        };
        if let Some(ref mut x) = self.xml {
            x.add_playlist(&pl.id, folder_id, 0, timestamp_ms());
        }
        Ok(pl)
    }

    pub fn commit(mut self) -> Result<(), RekordboxError> {
        log::info!("[rekordbox] Session commit starting...");
        if let Some(ref x) = self.xml {
            log::info!("[rekordbox] Saving XML playlist file to {:?}...", self.db_dir);
            x.save(&self.db_dir)?;
            log::info!("[rekordbox] XML playlist file saved");
        }
        log::info!("[rekordbox] Flushing USN and committing database transaction...");
        self.db.flush_usn_and_commit()?;
        log::info!("[rekordbox] Database transaction committed");
        Ok(())
    }
}

pub(super) fn export_single_track(
    db: &mut database::RekordboxDatabase, track: &ExportTrackRequest, playlist_id: &str, rekordbox_tracks_dir: &Path,
) -> Result<(bool, String), String> {
    let source = PathBuf::from(&track.source_path);
    log::debug!("[rekordbox] export_single_track: source={:?}", source);

    log::debug!("[rekordbox] Reading track metadata...");
    let metadata = content::read_track_metadata(&source).map_err(|e| {
        log::error!("[rekordbox] Metadata read failed: {}", e);
        format!("{}: metadata error — {}", track.source_path, e)
    })?;
    log::debug!("[rekordbox] Metadata: title='{}', artist='{}'", metadata.title, metadata.artist);

    log::debug!("[rekordbox] Copying track to rekordbox dir: {:?}", rekordbox_tracks_dir);
    let dest = file_manager::copy_track_to_rekordbox(&source, &metadata.artist, &metadata.title, rekordbox_tracks_dir).map_err(|e| {
        log::error!("[rekordbox] Copy failed: {}", e);
        format!("{}: copy failed — {}", track.source_path, e)
    })?;
    log::debug!("[rekordbox] Track copied to: {:?}", dest);

    log::debug!("[rekordbox] Adding content to database...");
    let content_id = content::add_content(db, &dest, &metadata).map_err(|e| {
        log::error!("[rekordbox] Database insert failed: {}", e);
        format!("{}: db insert failed — {}", track.source_path, e)
    })?;
    log::debug!("[rekordbox] Content added with id: {}", content_id);

    log::debug!("[rekordbox] Checking if content is already in playlist...");
    if is_content_in_playlist(db, playlist_id, &content_id).map_err(|e| {
        log::error!("[rekordbox] Playlist lookup failed: {}", e);
        format!("{}: playlist lookup failed — {}", track.source_path, e)
    })? {
        log::debug!("[rekordbox] Content already in playlist, skipping");
        return Ok((false, content_id));
    }

    log::debug!("[rekordbox] Adding content to playlist...");
    playlist::add_to_playlist(db, playlist_id, &content_id, None).map_err(|e| {
        log::error!("[rekordbox] Add to playlist failed: {}", e);
        format!("{}: add to playlist failed — {}", track.source_path, e)
    })?;
    log::debug!("[rekordbox] Content added to playlist successfully");

    Ok((true, content_id))
}

#[tauri::command]
#[specta::specta]
pub fn detect_rekordbox(manual_db_path: Option<String>, _app: tauri::AppHandle) -> Result<RekordboxStatus, ErrorResponse> {
    let is_running = config::is_rekordbox_running();
    let manual_db_path = manual_db_path.map(PathBuf::from);

    match config::detect_rekordbox(manual_db_path) {
        Ok(cfg) => Ok(RekordboxStatus { found: true, version: Some(cfg.version), db_path: Some(cfg.db_path.to_string_lossy().to_string()), is_running }),
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
    tracks: Vec<ExportTrackRequest>, playlist_name: Option<String>, parent_folder_id: Option<String>, manual_db_path: Option<String>, app: tauri::AppHandle,
) -> Result<ExportResult, ErrorResponse> {
    let ctx = RekordboxWriteContext::prepare(manual_db_path, &app)?;

    ctx.handle_result((|| -> Result<ExportResult, RekordboxError> {
        let mut session = ctx.open_session()?;
        let infrabooth_folder = session.init_infrabooth_folder()?;

        let target_parent_id = parent_folder_id.as_deref().unwrap_or(&infrabooth_folder.id);
        let target_playlist_name = playlist_name.as_deref().unwrap_or(ALL_TRACKS_PLAYLIST_NAME);
        let pl = session.find_or_create_playlist(target_playlist_name, target_parent_id)?;

        let rekordbox_tracks_dir = file_manager::get_rekordbox_tracks_dir(&ctx.app_data_dir);
        let mut exported_count = 0i32;
        let mut skipped_count = 0i32;
        let mut errors: Vec<String> = Vec::new();

        for track in &tracks {
            match export_single_track(&mut session.db, track, &pl.id, &rekordbox_tracks_dir) {
                Ok((true, _)) => exported_count += 1,
                Ok((false, _)) => skipped_count += 1,
                Err(e) => errors.push(e),
            }
        }

        session.commit()?;
        Ok(ExportResult { exported_count, skipped_count, playlist_name: pl.name, errors })
    })())
}

#[tauri::command]
#[specta::specta]
pub fn list_rekordbox_playlists(manual_db_path: Option<String>, _app: tauri::AppHandle) -> Result<Vec<RekordboxPlaylistInfo>, ErrorResponse> {
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
pub fn get_rekordbox_playlist_tree(manual_db_path: Option<String>, _app: tauri::AppHandle) -> Result<Vec<RekordboxTreeNode>, ErrorResponse> {
    let rb_config = resolve_rekordbox_config(manual_db_path)?;
    let db = database::RekordboxDatabase::open(&rb_config).map_err(ErrorResponse::from)?;
    playlist::get_playlist_tree(&db).map_err(ErrorResponse::from)
}

#[tauri::command]
#[specta::specta]
pub fn delete_rekordbox_playlist(playlist_id: String, manual_db_path: Option<String>, app: tauri::AppHandle) -> Result<(), ErrorResponse> {
    let ctx = RekordboxWriteContext::prepare(manual_db_path, &app)?;

    ctx.handle_result((|| -> Result<(), RekordboxError> {
        let mut session = ctx.open_session()?;

        let folder = playlist::find_infrabooth_folder(&session.db).ok_or_else(|| RekordboxError::NotFound("InfraBooth folder not found".into()))?;
        let target = playlist::find_playlist_in_folder(&session.db, &playlist_id, &folder.id).ok_or_else(|| {
            let target_type = playlist::find_playlist_by_id(&session.db, &playlist_id)
                .map(|pl| if pl.attribute == 1 { "folder" } else { "playlist outside the InfraBooth folder" })
                .unwrap_or("unknown playlist");
            RekordboxError::InvalidPlaylist(format!("Refusing to delete {} with ID {}", target_type, playlist_id))
        })?;

        playlist::delete_playlist(&mut session.db, &target.id)?;
        if let Some(ref mut xml) = session.xml {
            xml.remove_playlist(&target.id)?;
        }

        session.commit()?;
        Ok(())
    })())
}

#[tauri::command]
#[specta::specta]
pub fn quit_rekordbox() -> bool {
    config::quit_rekordbox()
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

    let path = std::fs::canonicalize(&backup_path).map_err(|e| ErrorResponse::from(RekordboxError::RestoreFailed(format!("Invalid backup path: {}", e))))?;

    let app_data_dir = get_app_data_dir(&app).map_err(app_data_dir_error)?;
    let backups_dir = std::fs::canonicalize(app_data_dir.join(backup::BACKUPS_DIR_NAME))
        .map_err(|e| ErrorResponse::from(RekordboxError::RestoreFailed(format!("Backups dir error: {}", e))))?;

    if !path.starts_with(&backups_dir) {
        return Err(ErrorResponse::from(RekordboxError::RestoreFailed("Backup path is outside the backups directory".into())));
    }

    backup::create_backup(&rb_config.db_dir, &app_data_dir, BackupKind::PreRestore).map_err(ErrorResponse::from)?;

    backup::restore_backup(&path, &rb_config.db_dir).map_err(ErrorResponse::from)
}
