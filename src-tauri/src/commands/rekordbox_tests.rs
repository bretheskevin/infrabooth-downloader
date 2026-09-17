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

    let canonical_dir = std::fs::canonicalize(temp_dir.path()).unwrap();
    assert_eq!(config.db_dir, canonical_dir);
    assert_eq!(config.db_path, canonical_dir.join("master.db"));
}

#[test]
fn resolve_rekordbox_config_accepts_manual_db_file() {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("master.db");
    std::fs::write(&db_path, b"sqlite").unwrap();

    let config = resolve_rekordbox_config(Some(db_path.to_string_lossy().to_string())).unwrap();

    let canonical_dir = std::fs::canonicalize(temp_dir.path()).unwrap();
    assert_eq!(config.db_dir, canonical_dir);
    assert_eq!(config.db_path, canonical_dir.join("master.db"));
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
#[test]
fn resolve_rekordbox_config_rejects_manual_path_inside_protected_dir() {
    let result = resolve_rekordbox_config(Some("/usr/local/rekordbox/master.db".to_string()));
    assert!(result.is_err());
}
