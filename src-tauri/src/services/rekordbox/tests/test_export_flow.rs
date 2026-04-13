use std::fs;

use crate::services::rekordbox::content;
use crate::services::rekordbox::file_manager;
use crate::services::rekordbox::models::TrackMetadata;
use crate::services::rekordbox::playlist;
use crate::services::rekordbox::tests::helpers::setup_test_db;

#[test]
fn test_full_export_flow_with_test_db() {
    let (tmp_dir, mut db) = setup_test_db();
    let rekordbox_tracks_dir = tmp_dir.path().join("rekordbox");
    fs::create_dir_all(&rekordbox_tracks_dir).unwrap();

    let source_dir = tmp_dir.path().join("downloads");
    fs::create_dir_all(&source_dir).unwrap();
    let track1_path = source_dir.join("track1.mp3");
    let track2_path = source_dir.join("track2.mp3");
    fs::write(&track1_path, vec![0u8; 2048]).unwrap();
    fs::write(&track2_path, vec![0u8; 4096]).unwrap();

    let folder = playlist::find_or_create_infrabooth_folder(&mut db)
        .expect("Failed to create InfraBooth folder");
    assert_eq!(folder.name, "InfraBooth Downloader");

    let pl = playlist::create_playlist(&mut db, "Test Export", &folder.id)
        .expect("Failed to create playlist");

    let dest1 = file_manager::copy_track_to_rekordbox(
        &track1_path,
        "Artist A",
        "Song One",
        &rekordbox_tracks_dir,
    )
    .expect("Copy track 1 failed");

    let dest2 = file_manager::copy_track_to_rekordbox(
        &track2_path,
        "Artist B",
        "Song Two",
        &rekordbox_tracks_dir,
    )
    .expect("Copy track 2 failed");

    let metadata1 = TrackMetadata {
        title: "Song One".to_string(),
        artist: "Artist A".to_string(),
        album: Some("Album 1".to_string()),
        duration_ms: Some(180000),
        bit_rate: Some(320),
        sample_rate: Some(44100),
    };

    let metadata2 = TrackMetadata {
        title: "Song Two".to_string(),
        artist: "Artist B".to_string(),
        album: None,
        duration_ms: Some(240000),
        bit_rate: Some(320),
        sample_rate: Some(44100),
    };

    let content_id1 = content::add_content(&mut db, &dest1, &metadata1).expect("Add content 1 failed");
    let content_id2 = content::add_content(&mut db, &dest2, &metadata2).expect("Add content 2 failed");

    let song1 = playlist::add_to_playlist(&mut db, &pl.id, &content_id1, None)
        .expect("Add to playlist 1 failed");
    let song2 = playlist::add_to_playlist(&mut db, &pl.id, &content_id2, None)
        .expect("Add to playlist 2 failed");

    assert_eq!(song1.track_no, 1);
    assert_eq!(song2.track_no, 2);

    db.flush_usn_and_commit().expect("Commit failed");

    let usn = db.get_local_usn().unwrap();
    assert!(usn > 1000, "USN should have incremented from 1000, got: {}", usn);

    assert!(rekordbox_tracks_dir.join("Artist A/Song One.mp3").exists());
    assert!(rekordbox_tracks_dir.join("Artist B/Song Two.mp3").exists());

    let count = playlist::count_playlist_songs(&db, &pl.id).unwrap();
    assert_eq!(count, 2);

    playlist::delete_playlist(&mut db, &pl.id).expect("Delete failed");
    db.flush_usn_and_commit().unwrap();

    assert!(playlist::find_playlist_by_name(&db, "Test Export", &folder.id).is_none());
    assert!(rekordbox_tracks_dir.join("Artist A/Song One.mp3").exists());

    log::info!("Full export flow test passed!");
}
