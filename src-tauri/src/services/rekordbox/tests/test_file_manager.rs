use std::fs;
use tempfile::TempDir;

use crate::services::rekordbox::file_manager;

#[test]
fn test_sanitize_name() {
    assert_eq!(file_manager::sanitize_name("Hello/World"), "Hello_World");
    assert_eq!(file_manager::sanitize_name("Track: Remix"), "Track_ Remix");
    assert_eq!(file_manager::sanitize_name("  spaces  "), "spaces");
    assert_eq!(file_manager::sanitize_name(""), "");
    assert_eq!(file_manager::sanitize_name("Normal Name"), "Normal Name");
}

#[test]
fn test_copy_track_creates_artist_dir() {
    let source_dir = TempDir::new().unwrap();
    let dest_dir = TempDir::new().unwrap();
    let source_file = source_dir.path().join("track.mp3");
    fs::write(&source_file, b"fake mp3 data").unwrap();
    let result = file_manager::copy_track_to_rekordbox(
        &source_file,
        "Test Artist",
        "Test Track",
        dest_dir.path(),
    )
    .expect("Copy failed");
    assert!(result.exists());
    assert_eq!(result.file_name().unwrap(), "Test Track.mp3");
    assert_eq!(
        result.parent().unwrap().file_name().unwrap(),
        "Test Artist"
    );
}

#[test]
fn test_copy_track_idempotent_same_size() {
    let source_dir = TempDir::new().unwrap();
    let dest_dir = TempDir::new().unwrap();
    let source_file = source_dir.path().join("track.mp3");
    fs::write(&source_file, b"fake mp3 data").unwrap();
    let path1 =
        file_manager::copy_track_to_rekordbox(&source_file, "Artist", "Track", dest_dir.path())
            .unwrap();
    let path2 =
        file_manager::copy_track_to_rekordbox(&source_file, "Artist", "Track", dest_dir.path())
            .unwrap();
    assert_eq!(path1, path2, "Same file should return same path");
}

#[test]
fn test_copy_track_conflict_different_size() {
    let source_dir = TempDir::new().unwrap();
    let dest_dir = TempDir::new().unwrap();
    let source1 = source_dir.path().join("track1.mp3");
    fs::write(&source1, b"short").unwrap();
    let source2 = source_dir.path().join("track2.mp3");
    fs::write(&source2, b"longer content here").unwrap();
    let path1 =
        file_manager::copy_track_to_rekordbox(&source1, "Artist", "Track", dest_dir.path())
            .unwrap();
    let path2 =
        file_manager::copy_track_to_rekordbox(&source2, "Artist", "Track", dest_dir.path())
            .unwrap();
    assert_ne!(path1, path2);
    assert_eq!(path2.file_name().unwrap(), "Track (2).mp3");
}

#[test]
fn test_copy_track_unknown_artist_fallback() {
    let source_dir = TempDir::new().unwrap();
    let dest_dir = TempDir::new().unwrap();
    let source_file = source_dir.path().join("track.mp3");
    fs::write(&source_file, b"data").unwrap();
    let result =
        file_manager::copy_track_to_rekordbox(&source_file, "", "Track", dest_dir.path()).unwrap();
    assert_eq!(
        result.parent().unwrap().file_name().unwrap(),
        "Unknown Artist"
    );
}
