use crate::services::rekordbox::models::{INFRABOOTH_FOLDER_NAME, PLAYLIST_TYPE_FOLDER, PLAYLIST_TYPE_PLAYLIST};
use crate::services::rekordbox::playlist;
use crate::services::rekordbox::tests::helpers::setup_test_db;

#[test]
fn test_find_or_create_infrabooth_folder() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).expect("Failed to create folder");
    assert_eq!(folder.name, INFRABOOTH_FOLDER_NAME);
    assert_eq!(folder.attribute, PLAYLIST_TYPE_FOLDER);
    assert_eq!(folder.parent_id, "root");
    let folder2 = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    assert_eq!(folder.id, folder2.id);
}

#[test]
fn test_create_playlist() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    let pl = playlist::create_playlist(&mut db, "My Playlist", &folder.id).expect("Failed to create playlist");
    assert_eq!(pl.name, "My Playlist");
    assert_eq!(pl.attribute, PLAYLIST_TYPE_PLAYLIST);
    assert_eq!(pl.parent_id, folder.id);
    assert_eq!(pl.seq, 1);
}

#[test]
fn test_create_playlist_duplicate_name_gets_suffix() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    let pl1 = playlist::create_playlist(&mut db, "Dupe", &folder.id).unwrap();
    let pl2 = playlist::create_playlist(&mut db, "Dupe", &folder.id).unwrap();
    assert_eq!(pl1.name, "Dupe");
    assert_eq!(pl2.name, "Dupe (2)");
}

#[test]
fn test_delete_playlist() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    let pl = playlist::create_playlist(&mut db, "ToDelete", &folder.id).unwrap();
    playlist::delete_playlist(&mut db, &pl.id).expect("Delete failed");
    let found = playlist::find_playlist_by_name(&db, "ToDelete", &folder.id);
    assert!(found.is_none(), "Playlist should be deleted");
}

#[test]
fn test_add_to_playlist() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    let pl = playlist::create_playlist(&mut db, "Test", &folder.id).unwrap();

    let now = crate::services::rekordbox::database::now_timestamp();
    db.conn()
        .execute(
            "INSERT INTO djmdContent (ID, UUID, FolderPath, FileNameL, FileType, FileSize, \
             Analysed, DateCreated, StockDate, ContentLink, MasterDBID, MasterSongID, \
             rb_file_id, DeviceID, HotCueAutoLoad, rb_data_status, rb_local_data_status, \
             rb_local_deleted, rb_local_synced, created_at, updated_at) \
             VALUES ('100', 'uuid-100', '/fake.mp3', 'fake.mp3', 1, 1000, 0, \
             '2026-04-11', '2026-04-11', 100, 'MDB', '100', '200', '1', 'on', \
             0, 0, 0, 0, ?1, ?2)",
            rusqlite::params![now, now],
        )
        .unwrap();

    let song = playlist::add_to_playlist(&mut db, &pl.id, "100", None).unwrap();
    assert_eq!(song.track_no, 1);
    assert_eq!(song.content_id, "100");
}

#[test]
fn test_add_to_playlist_tracks_shifted_rows_for_usn() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    let pl = playlist::create_playlist(&mut db, "Test", &folder.id).unwrap();

    let now = crate::services::rekordbox::database::now_timestamp();
    db.conn()
        .execute(
            "INSERT INTO djmdContent (ID, UUID, FolderPath, FileNameL, FileType, FileSize, \
             Analysed, DateCreated, StockDate, ContentLink, MasterDBID, MasterSongID, \
             rb_file_id, DeviceID, HotCueAutoLoad, rb_data_status, rb_local_data_status, \
             rb_local_deleted, rb_local_synced, created_at, updated_at) \
             VALUES ('100', 'uuid-100', '/fake-1.mp3', 'fake-1.mp3', 1, 1000, 0, \
             '2026-04-11', '2026-04-11', 100, 'MDB', '100', '200', '1', 'on', \
             0, 0, 0, 0, ?1, ?2)",
            rusqlite::params![now, now],
        )
        .unwrap();
    db.conn()
        .execute(
            "INSERT INTO djmdContent (ID, UUID, FolderPath, FileNameL, FileType, FileSize, \
             Analysed, DateCreated, StockDate, ContentLink, MasterDBID, MasterSongID, \
             rb_file_id, DeviceID, HotCueAutoLoad, rb_data_status, rb_local_data_status, \
             rb_local_deleted, rb_local_synced, created_at, updated_at) \
             VALUES ('101', 'uuid-101', '/fake-2.mp3', 'fake-2.mp3', 1, 1000, 0, \
             '2026-04-11', '2026-04-11', 100, 'MDB', '101', '201', '1', 'on', \
             0, 0, 0, 0, ?1, ?2)",
            rusqlite::params![now, now],
        )
        .unwrap();

    let first_song = playlist::add_to_playlist(&mut db, &pl.id, "100", None).unwrap();
    db.flush_usn_and_commit().unwrap();
    let initial_usn = db.get_local_usn().unwrap();

    let inserted_song = playlist::add_to_playlist(&mut db, &pl.id, "101", Some(1)).unwrap();
    db.flush_usn_and_commit().unwrap();

    let updated_usn = db.get_local_usn().unwrap();
    assert_eq!(inserted_song.track_no, 1);
    assert_eq!(updated_usn, initial_usn + 2);

    let shifted_track_no: i32 =
        db.conn().query_row("SELECT TrackNo FROM djmdSongPlaylist WHERE ContentID = ?1", rusqlite::params![first_song.content_id], |row| row.get(0)).unwrap();
    assert_eq!(shifted_track_no, 2);
}

#[test]
fn test_list_playlists_in_folder() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    playlist::create_playlist(&mut db, "PL1", &folder.id).unwrap();
    playlist::create_playlist(&mut db, "PL2", &folder.id).unwrap();
    let list = playlist::list_playlists_in_folder(&db, &folder.id).unwrap();
    assert_eq!(list.len(), 2);
    assert_eq!(list[0].name, "PL1");
    assert_eq!(list[1].name, "PL2");
}

#[test]
fn test_get_playlist_tree() {
    let (_tmp, mut db) = setup_test_db();
    let folder = playlist::find_or_create_infrabooth_folder(&mut db).unwrap();
    playlist::create_playlist(&mut db, "PL1", &folder.id).unwrap();
    playlist::create_playlist(&mut db, "PL2", &folder.id).unwrap();

    let tree = playlist::get_playlist_tree(&db).unwrap();
    assert_eq!(tree.len(), 3);

    let folder_node = tree.iter().find(|n| n.id == folder.id).unwrap();
    assert_eq!(folder_node.name, INFRABOOTH_FOLDER_NAME);
    assert_eq!(folder_node.attribute, PLAYLIST_TYPE_FOLDER);
    assert_eq!(folder_node.parent_id, "root");

    let pl_nodes: Vec<_> = tree.iter().filter(|n| n.attribute == PLAYLIST_TYPE_PLAYLIST).collect();
    assert_eq!(pl_nodes.len(), 2);
    assert_eq!(pl_nodes[0].name, "PL1");
    assert_eq!(pl_nodes[1].name, "PL2");
    assert_eq!(pl_nodes[0].parent_id, folder.id);
}
