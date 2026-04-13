use std::fs;
use std::path::{Path, PathBuf};

use crate::models::error::RekordboxError;

const REKORDBOX_DIR_NAME: &str = "rekordbox";

pub fn sanitize_name(name: &str) -> String {
    crate::services::filename::sanitize_path_component(name)
        .trim()
        .to_string()
}

fn files_match(source_path: &Path, target_path: &Path) -> Result<bool, RekordboxError> {
    let source_meta = fs::metadata(source_path)
        .map_err(|e| RekordboxError::FileError(format!("Cannot stat source: {}", e)))?;
    let target_meta = fs::metadata(target_path)
        .map_err(|e| RekordboxError::FileError(format!("Cannot stat target: {}", e)))?;

    if source_meta.len() != target_meta.len() {
        return Ok(false);
    }

    let source_bytes = fs::read(source_path)
        .map_err(|e| RekordboxError::FileError(format!("Cannot read source: {}", e)))?;
    let target_bytes = fs::read(target_path)
        .map_err(|e| RekordboxError::FileError(format!("Cannot read target: {}", e)))?;

    Ok(source_bytes == target_bytes)
}

pub fn copy_track_to_rekordbox(
    source_path: &Path,
    artist: &str,
    title: &str,
    rekordbox_root: &Path,
) -> Result<PathBuf, RekordboxError> {
    let artist_dir_name = if artist.trim().is_empty() {
        "Unknown Artist".to_string()
    } else {
        sanitize_name(artist)
    };

    let file_stem = if title.trim().is_empty() {
        source_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "untitled".to_string())
    } else {
        sanitize_name(title)
    };

    let extension = source_path
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_else(|| "mp3".to_string());

    let artist_dir = rekordbox_root.join(&artist_dir_name);
    fs::create_dir_all(&artist_dir)
        .map_err(|e| RekordboxError::FileError(format!("Cannot create artist dir: {}", e)))?;

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

            fs::copy(source_path, &alt_path)
                .map_err(|e| RekordboxError::FileError(format!("Copy failed: {}", e)))?;
            return Ok(alt_path);
        }
        return Err(RekordboxError::FileError(
            "Too many filename conflicts".into(),
        ));
    }

    fs::copy(source_path, &target_path)
        .map_err(|e| RekordboxError::FileError(format!("Copy failed: {}", e)))?;
    Ok(target_path)
}

pub fn get_rekordbox_tracks_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(REKORDBOX_DIR_NAME)
}
