use rand::RngExt;
use rusqlite::Connection;

use super::config;
use super::models::RekordboxConfig;
use super::models::UsnUpdate;
use crate::models::error::RekordboxError;

const MIN_GENERATED_ID: i64 = 100;
const MAX_ID_GENERATION_ATTEMPTS: u32 = 1_000_000;
const ID_BIT_SHIFT: u32 = 4;

const ALLOWED_TABLES: &[&str] = &["djmdContent", "djmdPlaylist", "djmdSongPlaylist", "djmdArtist", "djmdAlbum"];

pub(crate) fn validate_table_name(table_name: &str) -> Result<&str, RekordboxError> {
    ALLOWED_TABLES
        .iter()
        .find(|&&t| t == table_name)
        .copied()
        .ok_or_else(|| RekordboxError::DatabaseError(format!("Invalid table name: {}", table_name)))
}

pub struct RekordboxDatabase {
    conn: Connection,
    pending_usn_updates: Vec<UsnUpdate>,
}

impl RekordboxDatabase {
    pub fn open(config: &RekordboxConfig) -> Result<Self, RekordboxError> {
        let key = config::db_key();
        let conn = Connection::open(&config.db_path).map_err(|e| RekordboxError::DatabaseError(format!("Cannot open DB: {}", e)))?;

        // SAFETY: `key` is a compile-time constant hex string, not user input — no injection risk
        conn.execute_batch(&format!("PRAGMA key = '{}';", key))
            .map_err(|e| RekordboxError::DatabaseError(format!("Cannot set key: {}", e)))?;

        conn.execute_batch("SELECT count(*) FROM agentRegistry;")
            .map_err(|e| RekordboxError::DatabaseError(format!("Decryption failed: {}", e)))?;

        conn.execute_batch("BEGIN")
            .map_err(|e| RekordboxError::DatabaseError(format!("BEGIN failed: {}", e)))?;

        Ok(Self { conn, pending_usn_updates: Vec::new() })
    }

    #[cfg(test)]
    pub fn open_unencrypted(db_path: &std::path::Path, _db_dir: std::path::PathBuf) -> Result<Self, RekordboxError> {
        let conn = Connection::open(db_path).map_err(|e| RekordboxError::DatabaseError(format!("Cannot open DB: {}", e)))?;

        conn.execute_batch("BEGIN")
            .map_err(|e| RekordboxError::DatabaseError(format!("BEGIN failed: {}", e)))?;

        Ok(Self { conn, pending_usn_updates: Vec::new() })
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    pub fn get_local_usn(&self) -> Result<i64, RekordboxError> {
        let usn: i64 = self
            .conn
            .query_row(
                "SELECT int_1 FROM agentRegistry WHERE registry_id = 'localUpdateCount'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| RekordboxError::DatabaseError(format!("Cannot read USN: {}", e)))?;
        Ok(usn)
    }

    pub fn track_usn_update(&mut self, table_name: &str, row_id: &str) {
        self.pending_usn_updates
            .push(UsnUpdate { table_name: table_name.to_string(), row_id: row_id.to_string() });
    }

    pub fn flush_usn_and_commit(&mut self) -> Result<(), RekordboxError> {
        let mut usn = self.get_local_usn()?;

        for update in &self.pending_usn_updates {
            let table = validate_table_name(&update.table_name)?;
            usn += 1;
            self.conn
                .execute(
                    &format!("UPDATE {} SET rb_local_usn = ?1, updated_at = ?2 WHERE ID = ?3", table),
                    rusqlite::params![usn, now_timestamp(), update.row_id],
                )
                .map_err(|e| {
                    RekordboxError::DatabaseError(format!("USN update failed for {}.{}: {}", update.table_name, update.row_id, e))
                })?;
        }

        self.conn
            .execute(
                "UPDATE agentRegistry SET int_1 = ?1, updated_at = ?2 \
                 WHERE registry_id = 'localUpdateCount'",
                rusqlite::params![usn, now_timestamp()],
            )
            .map_err(|e| RekordboxError::DatabaseError(format!("Global USN update failed: {}", e)))?;

        self.conn
            .execute_batch("COMMIT")
            .map_err(|e| RekordboxError::DatabaseError(format!("COMMIT failed: {}", e)))?;

        self.conn
            .execute_batch("BEGIN")
            .map_err(|e| RekordboxError::DatabaseError(format!("BEGIN after COMMIT failed: {}", e)))?;

        self.pending_usn_updates.clear();
        Ok(())
    }

    #[cfg(test)]
    pub fn rollback(&mut self) -> Result<(), RekordboxError> {
        self.pending_usn_updates.clear();
        self.conn
            .execute_batch("ROLLBACK")
            .map_err(|e| RekordboxError::DatabaseError(format!("ROLLBACK failed: {}", e)))?;
        Ok(())
    }

    #[cfg(test)]
    pub fn close(self) -> Result<(), RekordboxError> {
        self.conn
            .close()
            .map_err(|(_, e)| RekordboxError::DatabaseError(format!("Cannot close DB: {}", e)))
    }

    pub fn generate_unused_id(&self, table_name: &str) -> Result<i64, RekordboxError> {
        let table = validate_table_name(table_name)?;
        let mut rng = rand::rng();
        for _ in 0..MAX_ID_GENERATION_ATTEMPTS {
            let raw: u32 = rng.random();
            let id = (raw >> ID_BIT_SHIFT) as i64;
            if id < MIN_GENERATED_ID {
                continue;
            }

            let exists: bool = self
                .conn
                .query_row(
                    &format!("SELECT EXISTS(SELECT 1 FROM {} WHERE ID = ?1)", table),
                    rusqlite::params![id.to_string()],
                    |row| row.get(0),
                )
                .map_err(|e| RekordboxError::DatabaseError(format!("ID check failed: {}", e)))?;

            if !exists {
                return Ok(id);
            }
        }

        Err(RekordboxError::DatabaseError(
            "Could not generate unused ID after max attempts".into(),
        ))
    }
}

pub fn timestamp_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub fn now_timestamp() -> String {
    let now = time::OffsetDateTime::now_utc();
    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}.000 +00:00",
        now.year(),
        now.month() as u8,
        now.day(),
        now.hour(),
        now.minute(),
        now.second()
    )
}

pub fn today_date() -> String {
    let now = time::OffsetDateTime::now_utc();
    format!("{:04}-{:02}-{:02}", now.year(), now.month() as u8, now.day())
}
