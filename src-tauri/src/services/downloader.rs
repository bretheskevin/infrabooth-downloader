//! FFmpeg-based audio downloader service.
//!
//! Downloads audio from SoundCloud by resolving stream URLs via the
//! SoundCloud API v2 and using ffmpeg to download + convert to MP3.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use tokio::sync::{watch, Mutex};

use crate::models::error::DownloadError;
use crate::models::ErrorResponse;
use crate::services::sidecar::bytes_to_string;

use crate::services::stream;

/// 320kbps MP3 ≈ 40 bytes per millisecond (320_000 bits/s ÷ 8 ÷ 1000).
const MP3_320KBPS_BYTES_PER_MS: u64 = 40;

#[derive(Debug, Clone)]
pub struct PlaylistContext {
    pub track_position: u32,
    pub total_tracks: u32,
}

pub struct TrackDownloadToMp3Config {
    pub track_url: String,
    pub track_id: String,
    pub output_dir: PathBuf,
    pub playlist_context: Option<PlaylistContext>,
    pub artist: String,
    pub title: String,
    pub duration_ms: u64,
    pub oauth_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct DownloadProgress {
    pub percent: f32,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub total_bytes: Option<u64>,
    pub downloaded_bytes: Option<u64>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressEvent {
    pub track_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub downloaded_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ErrorResponse>,
}

fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            _ => c,
        })
        .collect()
}

/// Builds the base filename (without extension) for a track.
/// Returns (base_name, display_title) where display_title is used for UI.
pub fn build_base_filename(
    playlist_context: &Option<PlaylistContext>,
    artist: &str,
    title: &str,
) -> (String, String) {
    let safe_artist = sanitize_filename(artist);
    let safe_title = sanitize_filename(title);

    match playlist_context {
        Some(ctx) => {
            let width = if ctx.total_tracks < 10 {
                1
            } else if ctx.total_tracks < 100 {
                2
            } else {
                3
            };
            let track_num = format!("{:0width$}", ctx.track_position, width = width);
            let base_name = format!("{} - {} - {}", track_num, safe_artist, safe_title);
            let display_title = format!("{} - {}", track_num, title);
            (base_name, display_title)
        }
        None => {
            let base_name = format!("{} - {}", safe_artist, safe_title);
            (base_name, title.to_string())
        }
    }
}

fn cleanup_partial_files(output_dir: &Path, base_name: &str) {
    let extensions = [".part", ".tmp"];

    let entries = match std::fs::read_dir(output_dir) {
        Ok(entries) => entries,
        Err(e) => {
            log::warn!("[downloader] Failed to read output dir for cleanup: {}", e);
            return;
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with(base_name) && extensions.iter().any(|ext| name.ends_with(ext)) {
                log::info!("[downloader] Cleaning up partial file: {:?}", path);
                if let Err(e) = std::fs::remove_file(&path) {
                    log::warn!(
                        "[downloader] Failed to remove partial file {:?}: {}",
                        path,
                        e
                    );
                }
            }
        }
    }
}

/// Parse ffmpeg's `-progress pipe:1` key=value output.
///
/// ffmpeg outputs lines like:
///   out_time_us=5000000  (microseconds of output processed)
///   speed=2.5x
///   progress=end
pub fn parse_ffmpeg_progress(line: &str, duration_ms: u64) -> Option<DownloadProgress> {
    let line = line.trim();

    if line.starts_with("progress=end") {
        return Some(DownloadProgress {
            percent: 1.0,
            speed: None,
            eta: None,
            total_bytes: None,
            downloaded_bytes: None,
        });
    }

    if line.starts_with("out_time_us=") {
        let us_str = line.trim_start_matches("out_time_us=");
        if let Ok(out_us) = us_str.parse::<i64>() {
            if out_us < 0 || duration_ms == 0 {
                return None;
            }
            let out_ms = out_us as f64 / 1000.0;
            let percent = (out_ms / duration_ms as f64).min(1.0) as f32;
            return Some(DownloadProgress {
                percent,
                speed: None,
                eta: None,
                total_bytes: None,
                downloaded_bytes: None,
            });
        }
    }

    if line.starts_with("total_size=") {
        let size_str = line.trim_start_matches("total_size=");
        if let Ok(bytes) = size_str.parse::<u64>() {
            return Some(DownloadProgress {
                percent: -1.0,
                speed: None,
                eta: None,
                total_bytes: None,
                downloaded_bytes: Some(bytes),
            });
        }
    }

    if line.starts_with("speed=") {
        let speed_str = line.trim_start_matches("speed=").trim();
        if speed_str != "N/A" && !speed_str.is_empty() {
            return Some(DownloadProgress {
                percent: -1.0,
                speed: Some(speed_str.to_string()),
                eta: None,
                total_bytes: None,
                downloaded_bytes: None,
            });
        }
    }

    None
}

/// Classify ffmpeg stderr output into specific error types.
pub fn classify_ffmpeg_error(stderr: &str) -> Option<DownloadError> {
    let lower = stderr.to_lowercase();

    if lower.contains("403 forbidden") || lower.contains("server returned 403") {
        return Some(DownloadError::GeoBlocked("Access forbidden".to_string()));
    }
    if lower.contains("429") || lower.contains("rate limit") {
        return Some(DownloadError::RateLimited);
    }
    if lower.contains("404 not found") || lower.contains("server returned 404") {
        return Some(DownloadError::TrackUnavailable(
            "Stream not found (404)".to_string(),
        ));
    }
    if lower.contains("401 unauthorized") || lower.contains("server returned 401") {
        return Some(DownloadError::AuthRequired(
            "Authentication required".to_string(),
        ));
    }
    if lower.contains("connection timed out") || lower.contains("timeout") {
        return Some(DownloadError::NetworkError(
            "Connection timed out".to_string(),
        ));
    }
    if lower.contains("connection refused") {
        return Some(DownloadError::NetworkError(
            "Connection refused".to_string(),
        ));
    }
    if lower.contains("no space left") || lower.contains("disk full") {
        return Some(DownloadError::ConversionFailed("Disk is full".to_string()));
    }
    if lower.contains("invalid data found") || lower.contains("conversion failed") {
        return Some(DownloadError::ConversionFailed(
            "Audio conversion failed".to_string(),
        ));
    }

    None
}

pub async fn download_track_to_mp3<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: TrackDownloadToMp3Config,
    active_child: Option<Arc<Mutex<Option<CommandChild>>>>,
    cancel_rx: Option<watch::Receiver<bool>>,
    active_pid: Option<Arc<Mutex<Option<u32>>>>,
) -> Result<PathBuf, DownloadError> {
    // Resolve stream URL
    let stream_info = stream::resolve_stream_url(&config.track_url, config.oauth_token.as_deref()).await?;

    log::info!("[downloader] Resolved stream URL for track {}", config.track_id);

    // Build output filename
    let (base_name, _display_title) =
        build_base_filename(&config.playlist_context, &config.artist, &config.title);
    let output_file = config.output_dir.join(format!("{}.mp3", base_name));

    // Check if already downloaded
    if output_file.exists() {
        log::info!("[downloader] File already exists: {:?}", output_file);
        return Ok(output_file);
    }

    // Build ffmpeg args
    let output_str = output_file.to_string_lossy().to_string();
    let mut args: Vec<String> = Vec::new();

    // Input
    args.extend_from_slice(&["-i".to_string(), stream_info.url.clone()]);

    // Output codec and quality
    args.extend_from_slice(&[
        "-codec:a".to_string(),
        "libmp3lame".to_string(),
        "-b:a".to_string(),
        "320k".to_string(),
    ]);

    // Progress reporting
    args.extend_from_slice(&["-progress".to_string(), "pipe:1".to_string()]);

    // Error verbosity
    args.extend_from_slice(&["-v".to_string(), "error".to_string()]);

    // Overwrite
    args.push("-y".to_string());

    // Output file
    args.push(output_str.clone());

    // Spawn ffmpeg sidecar
    let shell = app.shell();
    let (mut rx, child) = shell
        .sidecar("ffmpeg")
        .map_err(|_| DownloadError::BinaryNotFound)?
        .args(&args)
        .spawn()
        .map_err(|_| DownloadError::BinaryNotFound)?;

    // Store PID for process tree killing
    let pid = child.pid();
    if let Some(ref active_pid_mutex) = active_pid {
        let mut guard = active_pid_mutex.lock().await;
        *guard = Some(pid);
        log::debug!("[downloader] Stored PID {} for process tree killing", pid);
    }

    if let Some(ref active_child_mutex) = active_child {
        let mut guard = active_child_mutex.lock().await;
        *guard = Some(child);
    }

    let mut last_error: Option<String> = None;
    let mut last_percent: f32 = 0.0;
    let mut last_downloaded_bytes: Option<u64> = None;
    // Estimate total output size from duration and target bitrate
    let estimated_total_bytes: Option<u64> = if config.duration_ms > 0 {
        Some(config.duration_ms * MP3_320KBPS_BYTES_PER_MS)
    } else {
        None
    };

    // Process ffmpeg output
    loop {
        // Check for cancellation
        if let Some(ref crx) = cancel_rx {
            if *crx.borrow() {
                log::info!("[downloader] Cancellation detected, aborting download");
                if let Some(ref active_child_mutex) = active_child {
                    let mut guard = active_child_mutex.lock().await;
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
                cleanup_partial_files(&config.output_dir, &base_name);
                // Also remove the incomplete output file
                let _ = std::fs::remove_file(&output_file);
                return Err(DownloadError::Cancelled);
            }
        }

        let event = tokio::select! {
            event = rx.recv() => event,
            _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => continue,
        };

        match event {
            Some(CommandEvent::Stdout(line_bytes)) => {
                let raw_line = bytes_to_string(&line_bytes);
                for line in raw_line.lines() {
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }

                    if let Some(progress) = parse_ffmpeg_progress(line, config.duration_ms) {
                        // Update tracking state
                        if progress.percent >= 0.0 {
                            last_percent = progress.percent;
                        }
                        if progress.downloaded_bytes.is_some() {
                            last_downloaded_bytes = progress.downloaded_bytes;
                        }

                        // Only emit meaningful progress updates
                        if progress.percent >= 0.0 {
                            let _ = app.emit(
                                "download-progress",
                                DownloadProgressEvent {
                                    track_id: config.track_id.clone(),
                                    status: "downloading".to_string(),
                                    percent: Some(last_percent),
                                    downloaded_bytes: last_downloaded_bytes,
                                    total_bytes: estimated_total_bytes,
                                    error: None,
                                },
                            );
                        }
                    }
                }
            }
            Some(CommandEvent::Stderr(line_bytes)) => {
                let line = bytes_to_string(&line_bytes);
                log::info!("ffmpeg stderr: {}", line);
                last_error = Some(line.clone());

                if let Some(err) = classify_ffmpeg_error(&line) {
                    log::info!(
                        "[downloader] Track {} error: {}",
                        config.track_id,
                        err
                    );
                    return Err(err);
                }
            }
            Some(CommandEvent::Terminated(payload)) => {
                if payload.code != Some(0) {
                    // Check if this was a cancellation
                    if let Some(ref crx) = cancel_rx {
                        if *crx.borrow() {
                            log::info!("[downloader] Download was cancelled (terminated)");
                            cleanup_partial_files(&config.output_dir, &base_name);
                            let _ = std::fs::remove_file(&output_file);
                            return Err(DownloadError::Cancelled);
                        }
                    }
                    log::error!(
                        "ffmpeg terminated with code {:?}: {:?}",
                        payload.code,
                        last_error
                    );
                    // Clean up failed output
                    let _ = std::fs::remove_file(&output_file);
                    return Err(DownloadError::DownloadFailed(
                        last_error.unwrap_or_else(|| "Unknown error".to_string()),
                    ));
                }
                break;
            }
            Some(_) => {}
            None => break,
        }
    }

    // Verify output file exists
    if !output_file.exists() {
        return Err(DownloadError::DownloadFailed(
            "Output file was not created".to_string(),
        ));
    }

    log::info!("[downloader] Download complete: {:?}", output_file);
    Ok(output_file)
}

#[cfg(test)]
mod tests {
    use super::*;

    // parse_ffmpeg_progress tests

    #[test]
    fn test_parse_ffmpeg_progress_basic() {
        // out_time_us=5000000 means 5 seconds
        // For a 10-second track (10000ms), this is 50%
        let progress = parse_ffmpeg_progress("out_time_us=5000000", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert!((p.percent - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_parse_ffmpeg_progress_complete() {
        let progress = parse_ffmpeg_progress("progress=end", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert!((p.percent - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_ffmpeg_progress_speed() {
        let progress = parse_ffmpeg_progress("speed=2.5x", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert_eq!(p.speed, Some("2.5x".to_string()));
    }

    #[test]
    fn test_parse_ffmpeg_progress_zero_duration() {
        let progress = parse_ffmpeg_progress("out_time_us=5000000", 0);
        assert!(progress.is_none());
    }

    #[test]
    fn test_parse_ffmpeg_progress_negative_time() {
        let progress = parse_ffmpeg_progress("out_time_us=-1", 10000);
        assert!(progress.is_none());
    }

    #[test]
    fn test_parse_ffmpeg_progress_total_size() {
        let progress = parse_ffmpeg_progress("total_size=1234567", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert_eq!(p.downloaded_bytes, Some(1234567));
    }

    #[test]
    fn test_parse_ffmpeg_progress_unrecognized_line() {
        assert!(parse_ffmpeg_progress("bitrate=320.0kbits/s", 10000).is_none());
        assert!(parse_ffmpeg_progress("", 10000).is_none());
    }

    #[test]
    fn test_parse_ffmpeg_progress_caps_at_100_percent() {
        // out_time_us exceeds duration
        let progress = parse_ffmpeg_progress("out_time_us=20000000", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert!((p.percent - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_ffmpeg_progress_speed_na() {
        let progress = parse_ffmpeg_progress("speed=N/A", 10000);
        assert!(progress.is_none());
    }

    // classify_ffmpeg_error tests

    #[test]
    fn test_classify_ffmpeg_error_403() {
        let err = classify_ffmpeg_error("Server returned 403 Forbidden");
        assert!(matches!(err, Some(DownloadError::GeoBlocked(_))));
    }

    #[test]
    fn test_classify_ffmpeg_error_429() {
        let err = classify_ffmpeg_error("HTTP error 429");
        assert!(matches!(err, Some(DownloadError::RateLimited)));
    }

    #[test]
    fn test_classify_ffmpeg_error_404() {
        let err = classify_ffmpeg_error("Server returned 404 Not Found");
        assert!(matches!(err, Some(DownloadError::TrackUnavailable(_))));
    }

    #[test]
    fn test_classify_ffmpeg_error_401() {
        let err = classify_ffmpeg_error("Server returned 401 Unauthorized");
        assert!(matches!(err, Some(DownloadError::AuthRequired(_))));
    }

    #[test]
    fn test_classify_ffmpeg_error_timeout() {
        let err = classify_ffmpeg_error("Connection timed out");
        assert!(matches!(err, Some(DownloadError::NetworkError(_))));
    }

    #[test]
    fn test_classify_ffmpeg_error_disk_full() {
        let err = classify_ffmpeg_error("No space left on device");
        assert!(matches!(err, Some(DownloadError::ConversionFailed(_))));
    }

    #[test]
    fn test_classify_ffmpeg_error_no_match() {
        let err = classify_ffmpeg_error("Stream mapping:");
        assert!(err.is_none());
    }

    #[test]
    fn test_classify_ffmpeg_error_invalid_data() {
        let err = classify_ffmpeg_error("Invalid data found when processing input");
        assert!(matches!(err, Some(DownloadError::ConversionFailed(_))));
    }

    // sanitize_filename tests

    #[test]
    fn test_sanitize_filename_special_chars() {
        assert_eq!(sanitize_filename("Artist/Name"), "Artist_Name");
        assert_eq!(sanitize_filename("Title:Test?"), "Title_Test_");
        assert_eq!(sanitize_filename("a<b>c|d"), "a_b_c_d");
    }

    #[test]
    fn test_sanitize_filename_control_chars() {
        assert_eq!(sanitize_filename("Artist\x00Name"), "Artist_Name");
        assert_eq!(sanitize_filename("Title\nTest"), "Title_Test");
    }

    #[test]
    fn test_sanitize_filename_normal_text() {
        assert_eq!(sanitize_filename("Normal Title"), "Normal Title");
        assert_eq!(
            sanitize_filename("Bartholomé - Track"),
            "Bartholomé - Track"
        );
    }

    // build_base_filename tests

    #[test]
    fn test_build_base_filename_single_track() {
        let (base, display) = build_base_filename(&None, "Artist", "Title");
        assert_eq!(base, "Artist - Title");
        assert_eq!(display, "Title");
    }

    #[test]
    fn test_build_base_filename_playlist_single_digit() {
        let ctx = Some(PlaylistContext {
            track_position: 1,
            total_tracks: 5,
        });
        let (base, display) = build_base_filename(&ctx, "Artist", "Title");
        assert_eq!(base, "1 - Artist - Title");
        assert_eq!(display, "1 - Title");
    }

    #[test]
    fn test_build_base_filename_playlist_double_digit() {
        let ctx = Some(PlaylistContext {
            track_position: 5,
            total_tracks: 47,
        });
        let (base, display) = build_base_filename(&ctx, "Artist", "Title");
        assert_eq!(base, "05 - Artist - Title");
        assert_eq!(display, "05 - Title");
    }

    #[test]
    fn test_build_base_filename_playlist_triple_digit() {
        let ctx = Some(PlaylistContext {
            track_position: 1,
            total_tracks: 150,
        });
        let (base, display) = build_base_filename(&ctx, "Artist", "Title");
        assert_eq!(base, "001 - Artist - Title");
        assert_eq!(display, "001 - Title");
    }
}
