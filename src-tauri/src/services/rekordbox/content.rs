use std::path::Path;

use id3::TagLike;
use rusqlite::params;
use rusqlite::OptionalExtension;
use uuid::Uuid;

use super::database::{self, RekordboxDatabase};
use super::models::{TrackMetadata, FILE_TYPE_MP3};
use crate::models::error::RekordboxError;

pub fn read_track_metadata(path: &Path) -> Result<TrackMetadata, RekordboxError> {
    let tag = id3::Tag::read_from_path(path).unwrap_or_else(|_| id3::Tag::new());
    let title = tag.title().map(|s| s.to_string()).unwrap_or_else(|| {
        path.file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string())
    });
    let artist = tag.artist().map(|s| s.to_string()).unwrap_or_else(|| "Unknown Artist".to_string());
    let album = tag.album().map(|s| s.to_string());
    let duration_ms = tag.duration().map(|d| d as i64);
    Ok(TrackMetadata { title, artist, album, duration_ms, bit_rate: None, sample_rate: None })
}

pub fn add_content(db: &mut RekordboxDatabase, file_path: &Path, metadata: &TrackMetadata) -> Result<String, RekordboxError> {
    let folder_path = file_path
        .to_str()
        .ok_or_else(|| RekordboxError::FileError("Invalid file path encoding".into()))?
        .to_string();

    if let Some(existing_id) = find_content_id_by_path(db, &folder_path)? {
        return Ok(existing_id);
    }

    let file_name = file_path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();

    let file_size = std::fs::metadata(file_path).map(|m| m.len() as i64).unwrap_or(0);

    let artist_id = resolve_or_create_artist(db, &metadata.artist)?;
    let album_id = metadata.album.as_ref().map(|name| resolve_or_create_album(db, name)).transpose()?;

    let (device_id, master_db_id) = get_device_info(db)?;
    let content_link = get_content_link(db)?;

    let id = db.generate_unused_id("djmdContent")?.to_string();
    let uuid = Uuid::new_v4().to_string();
    let now = database::now_timestamp();
    let today = database::today_date();

    let search_str = build_search_str(&metadata.title, &metadata.artist, metadata.album.as_deref());

    let length_sec = metadata.duration_ms.map(|ms| (ms / 1000) as i32);

    db.conn()
        .execute(
            "INSERT INTO djmdContent (
                ID, UUID, FolderPath, FileNameL, FileNameS, Title,
                ArtistID, AlbumID, GenreID, FileType, FileSize,
                BitRate, Length, SampleRate, Analysed,
                DateCreated, StockDate, SearchStr, ContentLink,
                MasterDBID, MasterSongID, rb_file_id, DeviceID,
                HotCueAutoLoad, rb_data_status, rb_local_data_status,
                rb_local_deleted, rb_local_synced,
                created_at, updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, ?9, ?10, ?11,
                ?12, ?13, ?14, ?15,
                ?16, ?17, ?18, ?19,
                ?20, ?21, ?22, ?23,
                ?24, ?25, ?26,
                ?27, ?28,
                ?29, ?30
            )",
            params![
                id,
                uuid,
                folder_path,
                file_name,
                file_name,
                metadata.title,
                artist_id,
                album_id,
                None::<String>,
                FILE_TYPE_MP3,
                file_size,
                metadata.bit_rate,
                length_sec,
                metadata.sample_rate,
                0_i32,
                today,
                today,
                search_str,
                content_link,
                master_db_id,
                uuid,
                uuid,
                device_id,
                "on",
                0_i32,
                0_i32,
                0_i32,
                0_i32,
                now,
                now,
            ],
        )
        .map_err(|e| RekordboxError::DatabaseError(format!("Insert content failed: {}", e)))?;

    db.track_usn_update("djmdContent", &id);

    Ok(id)
}

fn resolve_or_create_named_entity(db: &mut RekordboxDatabase, table: &str, name: &str) -> Result<String, RekordboxError> {
    let table = database::validate_table_name(table)?;
    let existing: Option<String> = db
        .conn()
        .query_row(&format!("SELECT ID FROM {} WHERE Name = ?1", table), params![name], |row| {
            row.get(0)
        })
        .optional()
        .map_err(|e| RekordboxError::DatabaseError(format!("{} lookup failed: {}", table, e)))?;

    if let Some(id) = existing {
        return Ok(id);
    }

    let id = db.generate_unused_id(table)?.to_string();
    let uuid = Uuid::new_v4().to_string();
    let now = database::now_timestamp();

    db.conn()
        .execute(
            &format!(
                "INSERT INTO {} (ID, Name, UUID, rb_data_status, rb_local_data_status, \
                 rb_local_deleted, rb_local_synced, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                table
            ),
            params![id, name, uuid, 0_i32, 0_i32, 0_i32, 0_i32, now, now],
        )
        .map_err(|e| RekordboxError::DatabaseError(format!("Insert into {} failed: {}", table, e)))?;

    db.track_usn_update(table, &id);
    Ok(id)
}

pub fn resolve_or_create_artist(db: &mut RekordboxDatabase, name: &str) -> Result<String, RekordboxError> {
    resolve_or_create_named_entity(db, "djmdArtist", name)
}

fn resolve_or_create_album(db: &mut RekordboxDatabase, name: &str) -> Result<String, RekordboxError> {
    resolve_or_create_named_entity(db, "djmdAlbum", name)
}

fn find_content_id_by_path(db: &RekordboxDatabase, path: &str) -> Result<Option<String>, RekordboxError> {
    db.conn()
        .query_row("SELECT ID FROM djmdContent WHERE FolderPath = ?1", params![path], |row| row.get(0))
        .optional()
        .map_err(|e| RekordboxError::DatabaseError(format!("Content query failed: {}", e)))
}

fn get_device_info(db: &RekordboxDatabase) -> Result<(String, String), RekordboxError> {
    db.conn()
        .query_row("SELECT ID, MasterDBID FROM djmdDevice LIMIT 1", [], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|e| RekordboxError::DatabaseError(format!("Device info query failed: {}", e)))
}

fn get_content_link(db: &RekordboxDatabase) -> Result<i64, RekordboxError> {
    db.conn()
        .query_row("SELECT rb_local_usn FROM djmdMenuItems WHERE Name = 'TRACK'", [], |row| row.get(0))
        .map_err(|e| RekordboxError::DatabaseError(format!("Content link query failed: {}", e)))
}

fn build_search_str(title: &str, artist: &str, album: Option<&str>) -> String {
    match album {
        Some(a) => format!("{} {} {}", title, artist, a),
        None => format!("{} {}", title, artist),
    }
}
