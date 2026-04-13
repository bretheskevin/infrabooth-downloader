use crate::services::rekordbox::models::{
    INFRABOOTH_FOLDER_NAME, PLAYLIST_TYPE_FOLDER, PLAYLIST_TYPE_PLAYLIST,
};
use crate::services::rekordbox::playlist;
use crate::services::rekordbox::tests::helpers::setup_test_db;

#[test]
fn test_find_or_create_infrabooth_folder() {
    let (_tmp, mut db) = setup_test_db();
    let folder =
        playlist::find_or_create_infrabooth_folder(&mut db).expect("Failed to create folder");
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
    let pl = playlist::create_playlist(&mut db, "My Playlist", &folder.id)
        .expect("Failed to create playlist");
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
