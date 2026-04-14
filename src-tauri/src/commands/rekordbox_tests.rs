use tempfile::tempdir;

use super::resolve_rekordbox_config;

#[test]
fn resolve_rekordbox_config_rejects_nonexistent_manual_path() {
    let result = resolve_rekordbox_config(Some("/nonexistent/path/master.db".to_string()));
    assert!(result.is_err());
}

#[test]
fn resolve_rekordbox_config_accepts_manual_db_directory() {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("master.db");
    std::fs::write(&db_path, b"sqlite").unwrap();

    let config = resolve_rekordbox_config(Some(temp_dir.path().to_string_lossy().to_string())).unwrap();

    assert_eq!(config.db_dir, temp_dir.path().to_path_buf());
    assert_eq!(config.db_path, db_path);
}

#[test]
fn resolve_rekordbox_config_accepts_manual_db_file() {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("master.db");
    std::fs::write(&db_path, b"sqlite").unwrap();

    let config = resolve_rekordbox_config(Some(db_path.to_string_lossy().to_string())).unwrap();

    assert_eq!(config.db_dir, temp_dir.path().to_path_buf());
    assert_eq!(config.db_path, db_path);
}
