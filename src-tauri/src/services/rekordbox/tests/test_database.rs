use crate::services::rekordbox::tests::helpers::setup_test_db;

#[test]
fn test_open_and_close() {
    let (_tmp, db) = setup_test_db();
    assert!(db.close().is_ok());
}

#[test]
fn test_get_local_usn() {
    let (_tmp, db) = setup_test_db();
    let usn = db.get_local_usn().expect("Failed to get USN");
    assert_eq!(usn, 1000);
}

#[test]
fn test_track_and_apply_usn_updates() {
    let (_tmp, mut db) = setup_test_db();
    db.track_usn_update("djmdPlaylist", "12345");
    db.track_usn_update("djmdSongPlaylist", "abcde");

    let initial_usn = db.get_local_usn().unwrap();
    assert_eq!(initial_usn, 1000);

    let now = crate::services::rekordbox::database::now_timestamp();
    db.conn()
        .execute(
            "INSERT INTO djmdPlaylist \
             (ID, UUID, Seq, Name, Attribute, ParentID, \
              rb_data_status, rb_local_data_status, rb_local_deleted, rb_local_synced, \
              created_at, updated_at) \
             VALUES ('12345', 'uuid1', 1, 'Test', 0, 'root', 0, 0, 0, 0, ?1, ?2)",
            rusqlite::params![now, now],
        )
        .unwrap();
    db.conn()
        .execute(
            "INSERT INTO djmdSongPlaylist \
             (ID, PlaylistID, ContentID, TrackNo, UUID, \
              rb_data_status, rb_local_data_status, rb_local_deleted, rb_local_synced, \
              created_at, updated_at) \
             VALUES ('abcde', '12345', '100', 1, 'uuid2', 0, 0, 0, 0, ?1, ?2)",
            rusqlite::params![now, now],
        )
        .unwrap();

    db.flush_usn_and_commit().expect("Commit failed");
    let new_usn = db.get_local_usn().unwrap();
    assert_eq!(new_usn, 1002, "USN should have incremented by 2");
}

#[test]
fn test_generate_unused_id() {
    let (_tmp, db) = setup_test_db();
    let id = db
        .generate_unused_id("djmdContent")
        .expect("ID generation failed");
    assert!(id >= 100, "ID should be >= 100, got: {}", id);
    assert!(id < (1 << 28), "ID should be 28-bit, got: {}", id);
}

#[test]
fn test_rollback_reverts_usn() {
    let (_tmp, mut db) = setup_test_db();
    db.track_usn_update("djmdPlaylist", "12345");
    db.rollback().expect("Rollback failed");
    let usn = db.get_local_usn().unwrap();
    assert_eq!(usn, 1000, "USN should be unchanged after rollback");
}
