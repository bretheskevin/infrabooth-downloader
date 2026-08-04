use tempfile::tempdir;

use super::resolve_rekordbox_config;

#[test]
fn resolve_rekordbox_config_rejects_nonexistent_manual_path() {
    let allowed = tempdir().unwrap();
    let result = resolve_rekordbox_config(Some("/nonexistent/path/master.db".to_string()), allowed.path());
    assert!(result.is_err());
}

#[test]
fn resolve_rekordbox_config_accepts_manual_db_directory() {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("master.db");
    std::fs::write(&db_path, b"sqlite").unwrap();

    let config = resolve_rekordbox_config(Some(temp_dir.path().to_string_lossy().to_string()), temp_dir.path()).unwrap();

    let canonical_dir = std::fs::canonicalize(temp_dir.path()).unwrap();
    assert_eq!(config.db_dir, canonical_dir);
    assert_eq!(config.db_path, canonical_dir.join("master.db"));
}

#[test]
fn resolve_rekordbox_config_accepts_manual_db_file() {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("master.db");
    std::fs::write(&db_path, b"sqlite").unwrap();

    let config = resolve_rekordbox_config(Some(db_path.to_string_lossy().to_string()), temp_dir.path()).unwrap();

    let canonical_dir = std::fs::canonicalize(temp_dir.path()).unwrap();
    assert_eq!(config.db_dir, canonical_dir);
    assert_eq!(config.db_path, canonical_dir.join("master.db"));
}

#[test]
fn resolve_rekordbox_config_rejects_manual_path_outside_allowed_root() {
    let allowed = tempdir().unwrap();
    let outside = tempdir().unwrap();
    let db_path = outside.path().join("master.db");
    std::fs::write(&db_path, b"sqlite").unwrap();

    let result = resolve_rekordbox_config(Some(db_path.to_string_lossy().to_string()), allowed.path());
    assert!(result.is_err());
}
