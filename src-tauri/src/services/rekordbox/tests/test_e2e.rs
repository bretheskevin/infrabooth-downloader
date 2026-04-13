use std::fs;
use std::path::PathBuf;

use crate::services::rekordbox::{backup, config, content, database::{self, timestamp_ms}, file_manager, playlist, xml_sync};

fn app_data_dir() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").expect("HOME not set");
        PathBuf::from(home).join("Library/Application Support/com.infrabooth.downloader")
    }
    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var("APPDATA").expect("APPDATA not set");
        PathBuf::from(app_data).join("com.infrabooth.downloader")
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        panic!("Unsupported platform for E2E test");
    }
}

fn fixture_mp3s() -> Vec<PathBuf> {
    let fixtures_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/rekordbox");
    let mut files: Vec<PathBuf> = fs::read_dir(&fixtures_dir)
        .expect("Cannot read fixtures dir")
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().map(|ext| ext == "mp3").unwrap_or(false))
        .collect();
    files.sort();
    files
}

#[test]
#[ignore]
fn test_e2e_export_fixtures_to_rekordbox() {
    let mp3s = fixture_mp3s();
    assert!(!mp3s.is_empty(), "No MP3 fixtures found in tests/fixtures/rekordbox/");

    let rb_config = config::detect_rekordbox(None).expect("Rekordbox not found");
    assert!(!config::is_rekordbox_running(), "Close Rekordbox before running this test");

    let app_dir = app_data_dir();
    fs::create_dir_all(&app_dir).expect("Cannot create app data dir");

    backup::create_backup(&rb_config.db_dir, &app_dir).expect("Backup failed");
    backup::rotate_backups(&app_dir, 5).expect("Rotation failed");

    let mut db = database::RekordboxDatabase::open(&rb_config).expect("Cannot open Rekordbox DB");
    let mut xml = xml_sync::PlaylistXml::read(&rb_config.db_dir).ok();

    let folder = playlist::find_or_create_infrabooth_folder(&mut db).expect("Folder creation failed");
    if let Some(ref mut x) = xml {
        x.add_playlist(&folder.id, "root", 1, timestamp_ms());
    }

    let pl = playlist::create_playlist(&mut db, "Test Fixtures", &folder.id)
        .expect("Playlist creation failed");
    if let Some(ref mut x) = xml {
        x.add_playlist(&pl.id, &folder.id, 0, timestamp_ms());
    }

    let tracks_dir = file_manager::get_rekordbox_tracks_dir(&app_dir);
    let mut exported = 0;

    for mp3 in &mp3s {
        let metadata = content::read_track_metadata(mp3).expect("Metadata read failed");
        let dest = file_manager::copy_track_to_rekordbox(
            mp3, &metadata.artist, &metadata.title, &tracks_dir,
        )
        .expect("Copy failed");

        let content_id = content::add_content(&mut db, &dest, &metadata).expect("Content add failed");
        playlist::add_to_playlist(&mut db, &pl.id, &content_id, None).expect("Playlist add failed");
        exported += 1;
        log::info!("Exported: {} - {}", metadata.artist, metadata.title);
    }

    if let Some(ref x) = xml {
        x.save(&rb_config.db_dir).expect("XML save failed");
    }
    db.flush_usn_and_commit().expect("DB commit failed");

    log::info!(
        "E2E done: {} tracks exported to playlist '{}'. Open Rekordbox to verify.",
        exported, pl.name
    );
    assert_eq!(exported, mp3s.len());
}
