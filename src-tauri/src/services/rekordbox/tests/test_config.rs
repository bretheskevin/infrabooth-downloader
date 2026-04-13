use crate::services::rekordbox::config;

#[test]
fn test_derive_key_returns_valid_key() {
    let key = config::db_key();
    assert!(key.starts_with("402fd"), "Key should start with 402fd, got: {}", &key[..10]);
}

#[test]
#[ignore]
fn test_detect_rekordbox_on_this_machine() {
    let result = config::detect_rekordbox(None);
    match result {
        Ok(cfg) => {
            assert!(cfg.db_path.exists(), "DB path should exist: {:?}", cfg.db_path);
            assert!(cfg.db_dir.exists(), "DB dir should exist: {:?}", cfg.db_dir);
            log::info!("Detected Rekordbox {}: {:?}", cfg.version, cfg.db_path);
        }
        Err(e) => {
            log::warn!("Rekordbox not detected (expected if not installed): {}", e);
        }
    }
}

#[test]
#[ignore]
fn test_is_rekordbox_running() {
    let running = config::is_rekordbox_running();
    log::info!("Rekordbox running: {}", running);
}

#[test]
fn test_manual_override_path() {
    let fake_path = std::path::PathBuf::from("/nonexistent/master.db");
    let result = config::detect_rekordbox(Some(fake_path));
    assert!(result.is_err(), "Should fail for nonexistent path");
}
