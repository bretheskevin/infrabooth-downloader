use std::fs;

use rusqlite::params;
use tempfile::TempDir;

use crate::services::rekordbox::content;
use crate::services::rekordbox::models::TrackMetadata;
use crate::services::rekordbox::tests::helpers::setup_test_db;

fn create_test_mp3(dir: &TempDir) -> std::path::PathBuf {
    let path = dir.path().join("test.mp3");
    fs::write(&path, vec![0u8; 1024]).unwrap();
    path
}

#[test]
fn test_add_content() {
    let (_tmp, mut db) = setup_test_db();
    let mp3_dir = TempDir::new().unwrap();
    let mp3_path = create_test_mp3(&mp3_dir);
    let metadata = TrackMetadata {
        title: "Test Track".to_string(),
        artist: "Test Artist".to_string(),
        album: Some("Test Album".to_string()),
        duration_ms: Some(180000),
        bit_rate: Some(320),
        sample_rate: Some(44100),
    };
    let content_id = content::add_content(&mut db, &mp3_path, &metadata)
        .expect("add_content failed");
    let (title, file_type, analysed): (Option<String>, i32, i32) = db
        .conn()
        .query_row(
            "SELECT Title, FileType, Analysed FROM djmdContent WHERE ID = ?1",
            params![content_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("content not found in DB");
    assert_eq!(title.as_deref(), Some("Test Track"));
    assert_eq!(file_type, 1);
    assert_eq!(analysed, 0);
}

#[test]
fn test_add_content_idempotent() {
    let (_tmp, mut db) = setup_test_db();
    let mp3_dir = TempDir::new().unwrap();
    let mp3_path = create_test_mp3(&mp3_dir);
    let metadata = TrackMetadata {
        title: "Track".to_string(),
        artist: "Artist".to_string(),
        album: None,
        duration_ms: None,
        bit_rate: None,
        sample_rate: None,
    };
    let first = content::add_content(&mut db, &mp3_path, &metadata).unwrap();
    let second = content::add_content(&mut db, &mp3_path, &metadata).unwrap();
    assert_eq!(first, second, "Should return same content ID on duplicate");
}

#[test]
fn test_resolve_or_create_artist() {
    let (_tmp, mut db) = setup_test_db();
    let id1 = content::resolve_or_create_artist(&mut db, "New Artist").unwrap();
    let id2 = content::resolve_or_create_artist(&mut db, "New Artist").unwrap();
    assert_eq!(id1, id2, "Same artist should return same ID");
    let id3 = content::resolve_or_create_artist(&mut db, "Different Artist").unwrap();
    assert_ne!(id1, id3, "Different artists should have different IDs");
}
