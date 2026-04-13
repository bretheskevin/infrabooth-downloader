use std::fs;
use tempfile::TempDir;

use crate::services::rekordbox::backup;

fn setup_fake_db_dir() -> TempDir {
    let tmp = TempDir::new().unwrap();
    fs::write(tmp.path().join("master.db"), b"fake-db-content").unwrap();
    fs::write(tmp.path().join("masterPlaylists6.xml"), b"<xml/>").unwrap();
    tmp
}

#[test]
fn test_create_backup() {
    let db_dir = setup_fake_db_dir();
    let backup_root = TempDir::new().unwrap();
    let path =
        backup::create_backup(db_dir.path(), backup_root.path()).expect("Backup creation failed");
    assert!(path.join("master.db").exists());
    assert!(path.join("masterPlaylists6.xml").exists());
    let content = fs::read(path.join("master.db")).unwrap();
    assert_eq!(content, b"fake-db-content");
}

#[test]
fn test_rotate_backups_keeps_max() {
    let backup_root = TempDir::new().unwrap();
    let backups_dir = backup_root.path().join("rekordbox-backups");
    fs::create_dir_all(&backups_dir).unwrap();
    for i in 0..7 {
        let name = format!("2026-04-{:02}_120000", 10 + i);
        let dir = backups_dir.join(&name);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("master.db"), b"data").unwrap();
        fs::write(dir.join("masterPlaylists6.xml"), b"xml").unwrap();
    }
    backup::rotate_backups(backup_root.path(), 5).expect("Rotation failed");
    let remaining: Vec<_> = fs::read_dir(&backups_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .collect();
    assert_eq!(remaining.len(), 5, "Should keep exactly 5 backups");
}

#[test]
fn test_restore_backup() {
    let db_dir = setup_fake_db_dir();
    let backup_root = TempDir::new().unwrap();
    let backup_path = backup::create_backup(db_dir.path(), backup_root.path()).unwrap();
    fs::write(db_dir.path().join("master.db"), b"modified-content").unwrap();
    backup::restore_backup(&backup_path, db_dir.path()).expect("Restore failed");
    let content = fs::read(db_dir.path().join("master.db")).unwrap();
    assert_eq!(
        content, b"fake-db-content",
        "Should restore original content"
    );
}

#[test]
fn test_restore_backup_removes_xml_when_snapshot_has_none() {
    let db_dir = TempDir::new().unwrap();
    fs::write(db_dir.path().join("master.db"), b"fake-db-content").unwrap();
    fs::write(db_dir.path().join("masterPlaylists6.xml"), b"<current/>").unwrap();

    let backup_root = TempDir::new().unwrap();
    let backup_path = backup_root.path().join("rekordbox-backups/2026-04-11_120000");
    fs::create_dir_all(&backup_path).unwrap();
    fs::write(backup_path.join("master.db"), b"fake-db-content").unwrap();

    backup::restore_backup(&backup_path, db_dir.path()).expect("Restore failed");

    assert!(
        !db_dir.path().join("masterPlaylists6.xml").exists(),
        "XML should be removed when it was absent from the backup snapshot"
    );
}

#[test]
fn test_list_backups() {
    let backup_root = TempDir::new().unwrap();
    let backups_dir = backup_root.path().join("rekordbox-backups");
    fs::create_dir_all(&backups_dir).unwrap();
    for name in ["2026-04-10_120000", "2026-04-11_140000"] {
        let dir = backups_dir.join(name);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("master.db"), b"data").unwrap();
        fs::write(dir.join("masterPlaylists6.xml"), b"xml").unwrap();
    }
    let list = backup::list_backups(backup_root.path()).expect("Listing failed");
    assert_eq!(list.len(), 2);
    assert_eq!(list[0].timestamp, "2026-04-10_120000");
    assert_eq!(list[1].timestamp, "2026-04-11_140000");
}
