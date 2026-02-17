use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};
use tokio::sync::{watch, Mutex};

use crate::models::error::YtDlpError;
use crate::models::ErrorResponse;
use crate::services::sidecar::{bytes_to_string, get_sidecar_version};
use crate::services::storage::{load_tokens, refresh_and_store_tokens};

fn get_ffmpeg_path() -> Option<PathBuf> {
    let exe_path = std::env::current_exe().ok()?;
    let exe_dir = exe_path.parent()?;

    #[cfg(target_os = "macos")]
    let names: &[&str] = if cfg!(target_arch = "aarch64") {
        &["ffmpeg", "ffmpeg-aarch64-apple-darwin"]
    } else {
        &["ffmpeg", "ffmpeg-x86_64-apple-darwin"]
    };

    #[cfg(target_os = "windows")]
    let names: &[&str] = &["ffmpeg.exe", "ffmpeg-x86_64-pc-windows-msvc.exe"];

    #[cfg(target_os = "linux")]
    let names: &[&str] = &["ffmpeg", "ffmpeg-x86_64-unknown-linux-gnu"];

    for name in names {
        let path = exe_dir.join(name);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

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
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct DownloadProgress {
    pub percent: f32,
    pub speed: Option<String>,
    pub eta: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressEvent {
    pub track_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<f32>,
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

struct OutputTemplateResult {
    template: String,
    display_title: String,
}

fn build_output_template(
    output_dir: &Path,
    playlist_context: &Option<PlaylistContext>,
    artist: &str,
    title: &str,
) -> OutputTemplateResult {
    let dir_str = output_dir.to_string_lossy();
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
            let display_title = format!("{} - {}", track_num, title);
            OutputTemplateResult {
                template: format!(
                    "{}/{} - {} - {}.%(ext)s",
                    dir_str, track_num, safe_artist, safe_title
                ),
                display_title,
            }
        }
        None => OutputTemplateResult {
            template: format!("{}/{} - {}.%(ext)s", dir_str, safe_artist, safe_title),
            display_title: title.to_string(),
        },
    }
}

fn classify_stderr_error(line: &str, not_found_msg: &str) -> Option<YtDlpError> {
    if detect_geo_block(line).is_some() {
        return Some(YtDlpError::GeoBlocked);
    }
    if line.contains("HTTP Error 403") {
        return Some(YtDlpError::GeoBlocked);
    }
    if line.contains("HTTP Error 429") || line.contains("rate limit") {
        return Some(YtDlpError::RateLimited);
    }
    if let Some(reason) = detect_unavailability(line) {
        return Some(YtDlpError::DownloadFailed(reason));
    }
    if line.contains("HTTP Error 404") {
        return Some(YtDlpError::DownloadFailed(not_found_msg.to_string()));
    }
    None
}

pub async fn download_track_to_mp3<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: TrackDownloadToMp3Config,
    active_child: Option<Arc<Mutex<Option<CommandChild>>>>,
    cancel_rx: Option<watch::Receiver<bool>>,
    active_pid: Option<Arc<Mutex<Option<u32>>>>,
    skip_auth: bool,
) -> Result<PathBuf, YtDlpError> {
    use crate::services::storage::is_token_expired_or_expiring;

    let valid_tokens = if skip_auth {
        log::info!("[ytdlp] Skipping auth (user chose standard quality)");
        None
    } else {
        let tokens = load_tokens().ok().flatten();

        match tokens {
            Some(t) if is_token_expired_or_expiring(t.expires_at) => {
                log::info!("[ytdlp] Token expired, attempting refresh...");
                match refresh_and_store_tokens(&t).await {
                    Ok(refreshed) => {
                        log::info!("[ytdlp] Token refreshed successfully");
                        Some(refreshed)
                    }
                    Err(e) => {
                        log::warn!("[ytdlp] Token refresh failed: {}", e);
                        return Err(YtDlpError::AuthRefreshFailed);
                    }
                }
            }
            Some(t) => {
                log::info!("[ytdlp] Using OAuth token for high quality download");
                Some(t)
            }
            None => {
                log::info!("[ytdlp] No OAuth token available - downloading without auth (128kbps)");
                None
            }
        }
    };

    let output_result = build_output_template(
        &config.output_dir,
        &config.playlist_context,
        &config.artist,
        &config.title,
    );

    let mut args = vec![
        "-v".to_string(),
        "-f".to_string(),
        "bestaudio".to_string(),
        "--no-playlist".to_string(),
        "-x".to_string(),
        "--audio-format".to_string(),
        "mp3".to_string(),
        "--audio-quality".to_string(),
        "320K".to_string(),
        "--replace-in-metadata".to_string(),
        "artist".to_string(),
        ".+".to_string(),
        config.artist.clone(),
        "--replace-in-metadata".to_string(),
        "title".to_string(),
        ".+".to_string(),
        output_result.display_title,
        "-o".to_string(),
        output_result.template,
        "--windows-filenames".to_string(),
        "--no-overwrites".to_string(),
        "--newline".to_string(),
        config.track_url.clone(),
    ];

    if let Some(ref t) = valid_tokens {
        args.insert(0, "--extractor-args".to_string());
        args.insert(1, format!("soundcloud:oauth_token={}", t.access_token));
        log::debug!("[ytdlp] Added OAuth token to yt-dlp args");
    }

    if let Some(ffmpeg_path) = get_ffmpeg_path() {
        args.insert(0, "--ffmpeg-location".to_string());
        args.insert(1, ffmpeg_path.to_string_lossy().to_string());
    }

    if let Some(ctx) = &config.playlist_context {
        args.insert(0, "--playlist-items".to_string());
        args.insert(1, ctx.track_position.to_string());
    }

    let shell = app.shell();
    let (mut rx, child) = shell
        .sidecar("yt-dlp")
        .map_err(|_| YtDlpError::BinaryNotFound)?
        .args(&args)
        .spawn()
        .map_err(|_| YtDlpError::BinaryNotFound)?;

    // Store the PID for process tree killing before moving child
    let pid = child.pid();
    if let Some(ref active_pid_mutex) = active_pid {
        let mut guard = active_pid_mutex.lock().await;
        *guard = Some(pid);
        log::debug!("[ytdlp] Stored PID {} for process tree killing", pid);
    }

    if let Some(ref active_child_mutex) = active_child {
        let mut guard = active_child_mutex.lock().await;
        *guard = Some(child);
    }

    let mut last_error: Option<String> = None;
    let mut output_path: Option<PathBuf> = None;
    let not_found_msg = "Track unavailable - may have been removed or made private";

    loop {
        // Check for cancellation at each iteration
        if let Some(ref crx) = cancel_rx {
            if *crx.borrow() {
                log::info!("[ytdlp] Cancellation detected, aborting download");
                // Kill the process if we still have access to it
                if let Some(ref active_child_mutex) = active_child {
                    let mut guard = active_child_mutex.lock().await;
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
                return Err(YtDlpError::Cancelled);
            }
        }

        // Use select to either receive an event or timeout (to check cancellation)
        let event = tokio::select! {
            event = rx.recv() => event,
            _ = tokio::time::sleep(std::time::Duration::from_millis(100)) => continue,
        };

        match event {
            Some(CommandEvent::Stdout(line_bytes)) => {
                let line = bytes_to_string(&line_bytes);
                log::info!("yt-dlp stdout: {}", line);

                if let Some(path) = parse_destination(&line) {
                    output_path = Some(PathBuf::from(path));
                }

                if let Some(progress) = parse_progress(&line) {
                    let _ = app.emit(
                        "download-progress",
                        DownloadProgressEvent {
                            track_id: config.track_id.clone(),
                            status: "downloading".to_string(),
                            percent: Some(progress.percent),
                            error: None,
                        },
                    );
                }
            }
            Some(CommandEvent::Stderr(line_bytes)) => {
                let line = bytes_to_string(&line_bytes);
                log::info!("yt-dlp stderr: {}", line);
                last_error = Some(line.clone());

                if let Some(err) = classify_stderr_error(&line, not_found_msg) {
                    log::info!("Track {} error: {}", config.track_id, err);
                    return Err(err);
                }
            }
            Some(CommandEvent::Terminated(payload)) => {
                if payload.code != Some(0) {
                    // Check if this was a cancellation
                    if let Some(ref crx) = cancel_rx {
                        if *crx.borrow() {
                            log::info!("[ytdlp] Download was cancelled (terminated)");
                            return Err(YtDlpError::Cancelled);
                        }
                    }
                    log::error!(
                        "yt-dlp terminated with code {:?}: {:?}",
                        payload.code,
                        last_error
                    );
                    return Err(YtDlpError::DownloadFailed(
                        last_error.unwrap_or_else(|| "Unknown error".to_string()),
                    ));
                }
                break; // Process completed successfully
            }
            Some(_) => {}
            None => break, // Channel closed
        }
    }

    let final_path = output_path.ok_or_else(|| {
        YtDlpError::DownloadFailed("Could not determine output filename".to_string())
    })?;

    if !final_path.exists() {
        return Err(YtDlpError::DownloadFailed(
            "Output file was not created".to_string(),
        ));
    }

    Ok(final_path)
}

pub async fn get_version<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<String, YtDlpError> {
    get_sidecar_version(app, "yt-dlp", "--version", || YtDlpError::BinaryNotFound).await
}

fn parse_destination(line: &str) -> Option<String> {
    if line.contains("Destination:") {
        line.split("Destination:")
            .nth(1)
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

fn detect_geo_block(stderr: &str) -> Option<String> {
    let patterns = [
        "not available in your country",
        "geo restricted",
        "geo-restricted",
        "not available in your region",
        "blocked in your country",
        "not available in your location",
        "is not available for playback",
        "not available in this country",
    ];

    let stderr_lower = stderr.to_lowercase();
    for pattern in patterns {
        if stderr_lower.contains(pattern) {
            return Some("Geographic restriction by rights holder".to_string());
        }
    }
    None
}

fn detect_unavailability(stderr: &str) -> Option<String> {
    let patterns = [
        "video unavailable",
        "this video is not available",
        "private video",
        "this track was removed",
        "does not exist",
        "video is unavailable",
        "content is not available",
        "has been removed",
        "no longer available",
        "track is private",
        "is private",
    ];

    let stderr_lower = stderr.to_lowercase();
    for pattern in patterns {
        if stderr_lower.contains(pattern) {
            return Some("Track unavailable - may have been removed or made private".to_string());
        }
    }
    None
}

fn parse_progress(line: &str) -> Option<DownloadProgress> {
    if !line.contains("[download]") || !line.contains('%') {
        return None;
    }

    let parts: Vec<&str> = line.split_whitespace().collect();

    let percent = parts.iter().find_map(|part| {
        if part.ends_with('%') {
            part.trim_end_matches('%').parse::<f32>().ok()
        } else {
            None
        }
    })?;

    let speed = parts
        .iter()
        .position(|&p| p == "at")
        .and_then(|i| parts.get(i + 1))
        .map(|s| s.to_string());

    let eta = parts
        .iter()
        .position(|&p| p == "ETA")
        .and_then(|i| parts.get(i + 1))
        .map(|s| s.to_string());

    Some(DownloadProgress {
        percent: percent / 100.0,
        speed,
        eta,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_output_template_single_track() {
        let output_dir = PathBuf::from("/downloads");
        let result = build_output_template(&output_dir, &None, "Artist", "Title");
        assert_eq!(result.template, "/downloads/Artist - Title.%(ext)s");
        assert_eq!(result.display_title, "Title");
    }

    #[test]
    fn test_build_output_template_playlist_single_digit() {
        let output_dir = PathBuf::from("/downloads");
        let ctx = Some(PlaylistContext {
            track_position: 1,
            total_tracks: 5,
        });
        let result = build_output_template(&output_dir, &ctx, "Artist", "Title");
        assert_eq!(result.template, "/downloads/1 - Artist - Title.%(ext)s");
        assert_eq!(result.display_title, "1 - Title");
    }

    #[test]
    fn test_build_output_template_playlist_double_digit() {
        let output_dir = PathBuf::from("/downloads");
        let ctx = Some(PlaylistContext {
            track_position: 5,
            total_tracks: 47,
        });
        let result = build_output_template(&output_dir, &ctx, "Artist", "Title");
        assert_eq!(result.template, "/downloads/05 - Artist - Title.%(ext)s");
        assert_eq!(result.display_title, "05 - Title");
    }

    #[test]
    fn test_build_output_template_playlist_triple_digit() {
        let output_dir = PathBuf::from("/downloads");
        let ctx = Some(PlaylistContext {
            track_position: 1,
            total_tracks: 150,
        });
        let result = build_output_template(&output_dir, &ctx, "Artist", "Title");
        assert_eq!(result.template, "/downloads/001 - Artist - Title.%(ext)s");
        assert_eq!(result.display_title, "001 - Title");
    }

    #[test]
    fn test_build_output_template_sanitizes_special_chars() {
        let output_dir = PathBuf::from("/downloads");
        let result = build_output_template(&output_dir, &None, "Artist/Name", "Title:Test?");
        assert_eq!(
            result.template,
            "/downloads/Artist_Name - Title_Test_.%(ext)s"
        );
    }

    #[test]
    fn test_build_output_template_sanitizes_control_chars() {
        let output_dir = PathBuf::from("/downloads");
        let result = build_output_template(&output_dir, &None, "Artist\x00Name", "Title\nTest");
        assert_eq!(
            result.template,
            "/downloads/Artist_Name - Title_Test.%(ext)s"
        );
    }

    #[test]
    fn test_parse_destination_download() {
        let line = "[download] Destination: /path/to/Artist - Title.mp3";
        assert_eq!(
            parse_destination(line),
            Some("/path/to/Artist - Title.mp3".to_string())
        );
    }

    #[test]
    fn test_parse_destination_extract_audio() {
        let line = "[ExtractAudio] Destination: /path/to/file.mp3";
        assert_eq!(
            parse_destination(line),
            Some("/path/to/file.mp3".to_string())
        );
    }

    #[test]
    fn test_parse_destination_no_match() {
        let line = "[download] 50% of 5.00MiB";
        assert_eq!(parse_destination(line), None);
    }

    #[test]
    fn test_parse_progress_valid_line() {
        let line = "[download]  50.0% of 5.00MiB at 1.00MiB/s ETA 00:02";
        let progress = parse_progress(line).expect("Should parse valid progress");
        assert!((progress.percent - 0.5).abs() < 0.01);
        assert_eq!(progress.speed, Some("1.00MiB/s".to_string()));
        assert_eq!(progress.eta, Some("00:02".to_string()));
    }

    #[test]
    fn test_parse_progress_100_percent() {
        let line = "[download] 100% of 5.00MiB in 00:05";
        let progress = parse_progress(line).expect("Should parse 100% progress");
        assert!((progress.percent - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_progress_invalid_line() {
        let line = "[info] Extracting URL: https://soundcloud.com/...";
        assert!(parse_progress(line).is_none());
    }

    #[test]
    fn test_parse_progress_no_percentage() {
        let line = "[download] Downloading video 1 of 1";
        assert!(parse_progress(line).is_none());
    }

    #[test]
    fn test_parse_progress_small_percentage() {
        let line = "[download]   1.5% of 10.00MiB at 500KiB/s ETA 00:20";
        let progress = parse_progress(line).expect("Should parse small percentage");
        assert!((progress.percent - 0.015).abs() < 0.001);
    }

    #[test]
    fn test_classify_stderr_error_geo_block() {
        let line = "ERROR: This track is not available in your country";
        assert!(matches!(
            classify_stderr_error(line, "Not found"),
            Some(YtDlpError::GeoBlocked)
        ));
    }

    #[test]
    fn test_classify_stderr_error_403() {
        let line = "ERROR: HTTP Error 403: Forbidden";
        assert!(matches!(
            classify_stderr_error(line, "Not found"),
            Some(YtDlpError::GeoBlocked)
        ));
    }

    #[test]
    fn test_classify_stderr_error_rate_limit() {
        let line = "ERROR: HTTP Error 429: rate limit exceeded";
        assert!(matches!(
            classify_stderr_error(line, "Not found"),
            Some(YtDlpError::RateLimited)
        ));
    }

    #[test]
    fn test_classify_stderr_error_unavailable() {
        let line = "ERROR: Video unavailable";
        assert!(matches!(
            classify_stderr_error(line, "Not found"),
            Some(YtDlpError::DownloadFailed(_))
        ));
    }

    #[test]
    fn test_classify_stderr_error_404_uses_custom_msg() {
        let line = "ERROR: HTTP Error 404: Not Found";
        let err = classify_stderr_error(line, "Playlist not found");
        match err {
            Some(YtDlpError::DownloadFailed(msg)) => assert_eq!(msg, "Playlist not found"),
            _ => panic!("Expected DownloadFailed with custom message"),
        }
    }

    #[test]
    fn test_classify_stderr_error_no_match() {
        let line = "WARNING: [soundcloud] Extracting URL";
        assert!(classify_stderr_error(line, "Not found").is_none());
    }

    #[test]
    fn test_detect_geo_block_not_available_country() {
        let stderr = "ERROR: This track is not available in your country";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_geo_restricted() {
        let stderr = "ERROR: Video geo restricted";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_geo_restricted_hyphen() {
        let stderr = "ERROR: This content is geo-restricted";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_not_available_region() {
        let stderr = "ERROR: Content not available in your region";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_blocked_country() {
        let stderr = "This track is blocked in your country";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_not_available_location() {
        let stderr = "ERROR: This content is not available in your location";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_not_available_playback() {
        let stderr = "ERROR: Track is not available for playback";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_case_insensitive() {
        let stderr = "ERROR: This track is NOT AVAILABLE IN YOUR COUNTRY";
        assert!(detect_geo_block(stderr).is_some());
    }

    #[test]
    fn test_detect_geo_block_returns_message() {
        let stderr = "ERROR: This track is not available in your country";
        let result = detect_geo_block(stderr);
        assert_eq!(
            result,
            Some("Geographic restriction by rights holder".to_string())
        );
    }

    #[test]
    fn test_detect_geo_block_no_match() {
        let stderr = "ERROR: Network timeout";
        assert!(detect_geo_block(stderr).is_none());
    }

    #[test]
    fn test_detect_geo_block_empty_string() {
        assert!(detect_geo_block("").is_none());
    }

    #[test]
    fn test_detect_geo_block_unrelated_error() {
        let stderr = "ERROR: Unable to download webpage: HTTP Error 500";
        assert!(detect_geo_block(stderr).is_none());
    }

    #[test]
    fn test_detect_unavailability_video_unavailable() {
        let stderr = "ERROR: Video unavailable";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_this_video_not_available() {
        let stderr = "ERROR: This video is not available";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_private_video() {
        let stderr = "ERROR: Private video. Sign in if you've been granted access to this video";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_track_removed() {
        let stderr = "ERROR: This track was removed by the uploader";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_does_not_exist() {
        let stderr = "ERROR: This page does not exist";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_video_is_unavailable() {
        let stderr = "ERROR: Video is unavailable";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_content_not_available() {
        let stderr = "ERROR: Content is not available";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_has_been_removed() {
        let stderr = "ERROR: This content has been removed";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_no_longer_available() {
        let stderr = "ERROR: This track is no longer available";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_track_is_private() {
        let stderr = "ERROR: Track is private";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_is_private() {
        let stderr = "ERROR: This content is private";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_case_insensitive() {
        let stderr = "ERROR: VIDEO UNAVAILABLE";
        assert!(detect_unavailability(stderr).is_some());
    }

    #[test]
    fn test_detect_unavailability_returns_message() {
        let stderr = "ERROR: Video unavailable";
        let result = detect_unavailability(stderr);
        assert_eq!(
            result,
            Some("Track unavailable - may have been removed or made private".to_string())
        );
    }

    #[test]
    fn test_detect_unavailability_no_match() {
        let stderr = "ERROR: Network timeout";
        assert!(detect_unavailability(stderr).is_none());
    }

    #[test]
    fn test_detect_unavailability_empty_string() {
        assert!(detect_unavailability("").is_none());
    }

    #[test]
    fn test_detect_unavailability_unrelated_error() {
        let stderr = "ERROR: Unable to download webpage: HTTP Error 500";
        assert!(detect_unavailability(stderr).is_none());
    }

    #[test]
    fn test_detect_unavailability_does_not_match_geo_block() {
        let stderr = "ERROR: This track is not available in your country";
        assert!(detect_unavailability(stderr).is_none());
    }

    #[test]
    fn test_parse_destination_with_unicode_characters() {
        let line = "[ExtractAudio] Destination: /path/to/Bartholomé - Bartholomé - Anya.mp3";
        assert_eq!(
            parse_destination(line),
            Some("/path/to/Bartholomé - Bartholomé - Anya.mp3".to_string())
        );
    }

    #[test]
    fn test_parse_destination_with_japanese_characters() {
        let line = "[download] Destination: /downloads/アーティスト - タイトル.mp3";
        assert_eq!(
            parse_destination(line),
            Some("/downloads/アーティスト - タイトル.mp3".to_string())
        );
    }

    #[test]
    fn test_parse_destination_with_emoji() {
        let line = "[download] Destination: /downloads/Artist - Track 🔥.mp3";
        assert_eq!(
            parse_destination(line),
            Some("/downloads/Artist - Track 🔥.mp3".to_string())
        );
    }
}
