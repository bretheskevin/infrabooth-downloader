use std::fs;
use std::path::{Path, PathBuf};

use crate::models::error::RekordboxError;

const REKORDBOX_DIR_NAME: &str = "rekordbox";

pub fn sanitize_name(name: &str) -> String {
    crate::services::filename::sanitize_path_component(name).trim().to_string()
}

fn files_match(source_path: &Path, target_path: &Path) -> Result<bool, RekordboxError> {
    use std::io::{BufReader, Read};

    let source_meta = fs::metadata(source_path).map_err(|e| RekordboxError::FileError(format!("Cannot stat source: {}", e)))?;
    let target_meta = fs::metadata(target_path).map_err(|e| RekordboxError::FileError(format!("Cannot stat target: {}", e)))?;

    if source_meta.len() != target_meta.len() {
        return Ok(false);
    }

    let mut src = BufReader::new(fs::File::open(source_path).map_err(|e| RekordboxError::FileError(format!("Cannot open source: {}", e)))?);
    let mut tgt = BufReader::new(fs::File::open(target_path).map_err(|e| RekordboxError::FileError(format!("Cannot open target: {}", e)))?);

    let mut src_buf = [0u8; 8192];
    let mut tgt_buf = [0u8; 8192];
    loop {
        let n1 = src.read(&mut src_buf).map_err(|e| RekordboxError::FileError(format!("Cannot read source: {}", e)))?;
        let n2 = tgt.read(&mut tgt_buf).map_err(|e| RekordboxError::FileError(format!("Cannot read target: {}", e)))?;
        if n1 != n2 || src_buf[..n1] != tgt_buf[..n2] {
            return Ok(false);
        }
        if n1 == 0 {
            return Ok(true);
        }
    }
}

pub fn copy_track_to_rekordbox(source_path: &Path, artist: &str, title: &str, rekordbox_root: &Path) -> Result<PathBuf, RekordboxError> {
    let artist_dir_name = if artist.trim().is_empty() {
        "Unknown Artist".to_string()
    } else {
        sanitize_name(artist)
    };

    let file_stem = if title.trim().is_empty() {
        source_path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "untitled".to_string())
    } else {
        sanitize_name(title)
    };

    let extension = source_path.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_else(|| "mp3".to_string());

    let artist_dir = rekordbox_root.join(&artist_dir_name);
    fs::create_dir_all(&artist_dir).map_err(|e| RekordboxError::FileError(format!("Cannot create artist dir: {}", e)))?;

    let target_filename = format!("{}.{}", file_stem, extension);
    let target_path = artist_dir.join(&target_filename);

    if target_path.exists() {
        if files_match(source_path, &target_path)? {
            return Ok(target_path);
        }

        for i in 2..=super::models::MAX_NAME_CONFLICTS {
            let alt_filename = format!("{} ({}).{}", file_stem, i, extension);
            let alt_path = artist_dir.join(&alt_filename);
            if alt_path.exists() {
                if files_match(source_path, &alt_path)? {
                    return Ok(alt_path);
                }
                continue;
            }

            move_file(source_path, &alt_path)?;
            return Ok(alt_path);
        }
        return Err(RekordboxError::FileError("Too many filename conflicts".into()));
    }

    move_file(source_path, &target_path)?;
    Ok(target_path)
}

fn move_file(source: &Path, target: &Path) -> Result<(), RekordboxError> {
    if fs::rename(source, target).is_ok() {
        return Ok(());
    }
    fs::copy(source, target).map_err(|e| RekordboxError::FileError(format!("Copy failed: {}", e)))?;
    let _ = fs::remove_file(source);
    Ok(())
}

pub fn get_rekordbox_tracks_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(REKORDBOX_DIR_NAME)
}
