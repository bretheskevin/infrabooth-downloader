use rusqlite::params;
use uuid::Uuid;

use super::database::{self, RekordboxDatabase};
use super::models::{DjmdPlaylist, DjmdSongPlaylist, INFRABOOTH_FOLDER_NAME, PLAYLIST_TYPE_FOLDER, PLAYLIST_TYPE_PLAYLIST};
use crate::models::error::RekordboxError;

const PLAYLIST_SELECT: &str = "\
    SELECT ID, Seq, Name, Attribute, ParentID \
    FROM djmdPlaylist";

fn row_to_playlist(row: &rusqlite::Row) -> rusqlite::Result<DjmdPlaylist> {
    Ok(DjmdPlaylist { id: row.get(0)?, seq: row.get(1)?, name: row.get(2)?, attribute: row.get(3)?, parent_id: row.get(4)? })
}

fn row_to_song(row: &rusqlite::Row) -> rusqlite::Result<DjmdSongPlaylist> {
    Ok(DjmdSongPlaylist { content_id: row.get(0)?, track_no: row.get(1)? })
}

fn find_playlist_by_name_and_type(db: &RekordboxDatabase, name: &str, parent_id: &str, attribute: i32) -> Option<DjmdPlaylist> {
    db.conn()
        .query_row(&format!("{} WHERE Name = ?1 AND Attribute = ?2 AND ParentID = ?3", PLAYLIST_SELECT), params![name, attribute, parent_id], row_to_playlist)
        .ok()
}

fn count_siblings(db: &RekordboxDatabase, parent_id: &str) -> Result<i32, RekordboxError> {
    db.conn()
        .query_row("SELECT COUNT(*) FROM djmdPlaylist WHERE ParentID = ?1", params![parent_id], |row| row.get(0))
        .map_err(|e| RekordboxError::DatabaseError(format!("Count siblings failed: {}", e)))
}

fn reorder_siblings(db: &mut RekordboxDatabase, parent_id: &str) -> Result<(), RekordboxError> {
    let ids: Vec<String> = {
        let mut stmt = db
            .conn()
            .prepare("SELECT ID FROM djmdPlaylist WHERE ParentID = ?1 ORDER BY Seq ASC")
            .map_err(|e| RekordboxError::DatabaseError(format!("Reorder query failed: {}", e)))?;

        let ids = stmt
            .query_map(params![parent_id], |row| row.get(0))
            .map_err(|e| RekordboxError::DatabaseError(format!("Reorder fetch failed: {}", e)))?
            .collect::<Result<Vec<String>, _>>()
            .map_err(|e| RekordboxError::DatabaseError(format!("Reorder collect failed: {}", e)))?;
        ids
    };

    {
        let mut stmt = db
            .conn()
            .prepare("UPDATE djmdPlaylist SET Seq = ?1 WHERE ID = ?2")
            .map_err(|e| RekordboxError::DatabaseError(format!("Reorder prepare failed: {}", e)))?;
        for (i, id) in ids.iter().enumerate() {
            stmt.execute(params![(i + 1) as i32, id]).map_err(|e| RekordboxError::DatabaseError(format!("Reorder update failed: {}", e)))?;
        }
    }

    for id in &ids {
        db.track_usn_update("djmdPlaylist", id);
    }

    Ok(())
}

fn deduplicate_name(db: &RekordboxDatabase, name: &str, parent_id: &str) -> Result<String, RekordboxError> {
    if find_playlist_by_name_and_type(db, name, parent_id, PLAYLIST_TYPE_PLAYLIST).is_none() {
        return Ok(name.to_string());
    }

    for counter in 2..=super::models::MAX_NAME_CONFLICTS {
        let candidate = format!("{} ({})", name, counter);
        if find_playlist_by_name_and_type(db, &candidate, parent_id, PLAYLIST_TYPE_PLAYLIST).is_none() {
            return Ok(candidate);
        }
    }
    Err(RekordboxError::DatabaseError(format!("Too many playlists named '{}' (limit: {})", name, super::models::MAX_NAME_CONFLICTS)))
}

fn insert_playlist_row(db: &mut RekordboxDatabase, id: &str, name: &str, attribute: i32, parent_id: &str, seq: i32) -> Result<(), RekordboxError> {
    let uuid = Uuid::new_v4().to_string();
    let now = database::now_timestamp();

    db.conn()
        .execute(
            "INSERT INTO djmdPlaylist \
             (ID, UUID, Seq, Name, ImagePath, Attribute, ParentID, SmartList, \
              rb_data_status, rb_local_data_status, rb_local_deleted, rb_local_synced, \
              usn, rb_local_usn, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, NULL, 0, 0, 0, 0, NULL, NULL, ?7, ?8)",
            params![id, uuid, seq, name, attribute, parent_id, now, now],
        )
        .map_err(|e| RekordboxError::DatabaseError(format!("Insert playlist failed: {}", e)))?;

    db.track_usn_update("djmdPlaylist", id);
    Ok(())
}

pub fn find_infrabooth_folder(db: &RekordboxDatabase) -> Option<DjmdPlaylist> {
    find_playlist_by_name_and_type(db, INFRABOOTH_FOLDER_NAME, "root", PLAYLIST_TYPE_FOLDER)
}

pub fn find_playlist_by_id(db: &RekordboxDatabase, playlist_id: &str) -> Option<DjmdPlaylist> {
    db.conn().query_row(&format!("{} WHERE ID = ?1", PLAYLIST_SELECT), params![playlist_id], row_to_playlist).ok()
}

pub fn find_playlist_in_folder(db: &RekordboxDatabase, playlist_id: &str, parent_id: &str) -> Option<DjmdPlaylist> {
    db.conn()
        .query_row(
            &format!("{} WHERE ID = ?1 AND ParentID = ?2 AND Attribute = ?3", PLAYLIST_SELECT),
            params![playlist_id, parent_id, PLAYLIST_TYPE_PLAYLIST],
            row_to_playlist,
        )
        .ok()
}

pub fn find_or_create_infrabooth_folder(db: &mut RekordboxDatabase) -> Result<DjmdPlaylist, RekordboxError> {
    if let Some(folder) = find_playlist_by_name_and_type(db, INFRABOOTH_FOLDER_NAME, "root", PLAYLIST_TYPE_FOLDER) {
        return Ok(folder);
    }

    let id = db.generate_unused_id("djmdPlaylist")?.to_string();
    let seq = count_siblings(db, "root")? + 1;
    insert_playlist_row(db, &id, INFRABOOTH_FOLDER_NAME, PLAYLIST_TYPE_FOLDER, "root", seq)?;

    find_playlist_by_name_and_type(db, INFRABOOTH_FOLDER_NAME, "root", PLAYLIST_TYPE_FOLDER)
        .ok_or_else(|| RekordboxError::DatabaseError("InfraBooth folder not found after insert".into()))
}

pub fn create_playlist(db: &mut RekordboxDatabase, name: &str, parent_id: &str) -> Result<DjmdPlaylist, RekordboxError> {
    let final_name = deduplicate_name(db, name, parent_id)?;
    let id = db.generate_unused_id("djmdPlaylist")?.to_string();
    let seq = count_siblings(db, parent_id)? + 1;
    insert_playlist_row(db, &id, &final_name, PLAYLIST_TYPE_PLAYLIST, parent_id, seq)?;

    db.conn()
        .query_row(&format!("{} WHERE ID = ?1", PLAYLIST_SELECT), params![id], row_to_playlist)
        .map_err(|e| RekordboxError::DatabaseError(format!("Playlist not found after insert: {}", e)))
}

pub fn delete_playlist(db: &mut RekordboxDatabase, playlist_id: &str) -> Result<(), RekordboxError> {
    let parent_id: String = db
        .conn()
        .query_row("SELECT ParentID FROM djmdPlaylist WHERE ID = ?1", params![playlist_id], |row| row.get(0))
        .map_err(|e| RekordboxError::DatabaseError(format!("Playlist not found for delete: {}", e)))?;

    db.conn()
        .execute("DELETE FROM djmdSongPlaylist WHERE PlaylistID = ?1", params![playlist_id])
        .map_err(|e| RekordboxError::DatabaseError(format!("Delete song entries failed: {}", e)))?;

    db.conn()
        .execute("DELETE FROM djmdPlaylist WHERE ID = ?1", params![playlist_id])
        .map_err(|e| RekordboxError::DatabaseError(format!("Delete playlist failed: {}", e)))?;

    reorder_siblings(db, &parent_id)?;

    Ok(())
}

pub fn add_to_playlist(db: &mut RekordboxDatabase, playlist_id: &str, content_id: &str, track_no: Option<i32>) -> Result<DjmdSongPlaylist, RekordboxError> {
    let current_count = count_playlist_songs(db, playlist_id)?;
    let target_pos = track_no.unwrap_or(current_count + 1);

    if target_pos <= current_count {
        let shifted_ids: Vec<String> = {
            let mut stmt = db
                .conn()
                .prepare("SELECT ID FROM djmdSongPlaylist WHERE PlaylistID = ?1 AND TrackNo >= ?2")
                .map_err(|e| RekordboxError::DatabaseError(format!("Shift lookup failed: {}", e)))?;
            let shifted_ids = stmt
                .query_map(params![playlist_id, target_pos], |row| row.get(0))
                .map_err(|e| RekordboxError::DatabaseError(format!("Shift fetch failed: {}", e)))?
                .collect::<Result<Vec<String>, _>>()
                .map_err(|e| RekordboxError::DatabaseError(format!("Shift collect failed: {}", e)))?;
            shifted_ids
        };

        db.conn()
            .execute(
                "UPDATE djmdSongPlaylist SET TrackNo = TrackNo + 1 \
                 WHERE PlaylistID = ?1 AND TrackNo >= ?2",
                params![playlist_id, target_pos],
            )
            .map_err(|e| RekordboxError::DatabaseError(format!("Shift tracks failed: {}", e)))?;

        for shifted_id in shifted_ids {
            db.track_usn_update("djmdSongPlaylist", &shifted_id);
        }
    }

    let id = db.generate_unused_id("djmdSongPlaylist")?.to_string();
    let uuid = Uuid::new_v4().to_string();
    let now = database::now_timestamp();

    db.conn()
        .execute(
            "INSERT INTO djmdSongPlaylist \
             (ID, PlaylistID, ContentID, TrackNo, UUID, \
              rb_data_status, rb_local_data_status, rb_local_deleted, rb_local_synced, \
              usn, rb_local_usn, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 0, 0, NULL, NULL, ?6, ?7)",
            params![id, playlist_id, content_id, target_pos, uuid, now, now],
        )
        .map_err(|e| RekordboxError::DatabaseError(format!("Insert song entry failed: {}", e)))?;

    db.track_usn_update("djmdSongPlaylist", &id);

    db.conn()
        .query_row(
            "SELECT ContentID, TrackNo \
             FROM djmdSongPlaylist WHERE ID = ?1",
            params![id],
            row_to_song,
        )
        .map_err(|e| RekordboxError::DatabaseError(format!("Song entry not found after insert: {}", e)))
}

pub fn find_playlist_by_name(db: &RekordboxDatabase, name: &str, parent_id: &str) -> Option<DjmdPlaylist> {
    find_playlist_by_name_and_type(db, name, parent_id, PLAYLIST_TYPE_PLAYLIST)
}

pub fn list_playlists_in_folder(db: &RekordboxDatabase, parent_id: &str) -> Result<Vec<DjmdPlaylist>, RekordboxError> {
    let mut stmt = db
        .conn()
        .prepare(&format!("{} WHERE ParentID = ?1 AND Attribute = ?2 ORDER BY Seq ASC", PLAYLIST_SELECT))
        .map_err(|e| RekordboxError::DatabaseError(format!("List playlists query failed: {}", e)))?;

    let playlists = stmt
        .query_map(params![parent_id, PLAYLIST_TYPE_PLAYLIST], row_to_playlist)
        .map_err(|e| RekordboxError::DatabaseError(format!("List playlists fetch failed: {}", e)))?
        .collect::<Result<Vec<DjmdPlaylist>, _>>()
        .map_err(|e| RekordboxError::DatabaseError(format!("List playlists collect failed: {}", e)))?;

    Ok(playlists)
}

pub fn count_playlist_songs(db: &RekordboxDatabase, playlist_id: &str) -> Result<i32, RekordboxError> {
    db.conn()
        .query_row("SELECT COUNT(*) FROM djmdSongPlaylist WHERE PlaylistID = ?1", params![playlist_id], |row| row.get(0))
        .map_err(|e| RekordboxError::DatabaseError(format!("Count songs failed: {}", e)))
}
