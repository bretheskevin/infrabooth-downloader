use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::models::error::YtDlpError;
use crate::models::ErrorResponse;
use crate::services::playlist::{PlaylistInfo, TrackInfo, UserInfo};
use crate::services::sidecar::{bytes_to_string, get_sidecar_version};
use crate::services::storage::load_tokens;

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

#[derive(Debug, Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub percent: f32,
    pub speed: Option<String>,
    pub eta: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressEvent {
    pub track_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ErrorResponse>,
}

fn build_output_template(
    output_dir: &PathBuf,
    playlist_context: &Option<PlaylistContext>,
) -> String {
    let dir_str = output_dir.to_string_lossy();

    match playlist_context {
        Some(ctx) => {
            let width = if ctx.total_tracks < 10 {
                1
            } else if ctx.total_tracks < 100 {
                2
            } else {
                3
            };
            format!(
                "{}/%(playlist_index)0{}d - %(artist)s - %(title)s.%(ext)s",
                dir_str, width
            )
        }
        None => {
            format!("{}/%(artist)s - %(title)s.%(ext)s", dir_str)
        }
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

async fn run_ytdlp_json<R: tauri::Runtime, T: serde::de::DeserializeOwned>(
    app: &AppHandle<R>,
    args: &[&str],
    not_found_msg: &str,
) -> Result<T, YtDlpError> {
    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("yt-dlp")
        .map_err(|_| YtDlpError::BinaryNotFound)?
        .args(args)
        .spawn()
        .map_err(|_| YtDlpError::BinaryNotFound)?;

    let mut json_output = String::new();
    let mut last_error: Option<String> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                json_output.push_str(&line);
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                log::debug!("yt-dlp stderr: {}", line);
                last_error = Some(line.clone());
                if let Some(err) = classify_stderr_error(&line, not_found_msg) {
                    return Err(err);
                }
            }
            CommandEvent::Terminated(payload) => {
                if payload.code != Some(0) {
                    return Err(YtDlpError::DownloadFailed(
                        last_error.unwrap_or_else(|| "Unknown error".to_string()),
                    ));
                }
            }
            _ => {}
        }
    }

    serde_json::from_str(&json_output)
        .map_err(|e| YtDlpError::DownloadFailed(format!("Failed to parse metadata: {}", e)))
}

pub async fn download_track_to_mp3<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: TrackDownloadToMp3Config,
) -> Result<PathBuf, YtDlpError> {
    use crate::services::storage::is_token_expired_or_expiring;

    let tokens = load_tokens().ok().flatten();

    match &tokens {
        Some(t) => {
            if is_token_expired_or_expiring(t.expires_at) {
                log::warn!(
                    "[ytdlp] Token is expired or expiring soon - downloading without auth (128kbps)"
                );
            } else {
                log::info!("[ytdlp] Using OAuth token for high quality download");
            }
        }
        None => {
            log::info!("[ytdlp] No OAuth token available - downloading without auth (128kbps)");
        }
    }

    let valid_tokens = tokens.filter(|t| !is_token_expired_or_expiring(t.expires_at));

    let output_template = build_output_template(&config.output_dir, &config.playlist_context);

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
        config.title.clone(),
        "-o".to_string(),
        output_template,
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
    let (mut rx, _child) = shell
        .sidecar("yt-dlp")
        .map_err(|_| YtDlpError::BinaryNotFound)?
        .args(&args)
        .spawn()
        .map_err(|_| YtDlpError::BinaryNotFound)?;

    let mut last_error: Option<String> = None;
    let mut output_path: Option<PathBuf> = None;
    let not_found_msg = "Track unavailable - may have been removed or made private";

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
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
            CommandEvent::Stderr(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                log::info!("yt-dlp stderr: {}", line);
                last_error = Some(line.clone());

                if let Some(err) = classify_stderr_error(&line, not_found_msg) {
                    log::info!("Track {} error: {}", config.track_id, err);
                    return Err(err);
                }
            }
            CommandEvent::Terminated(payload) => {
                if payload.code != Some(0) {
                    log::error!(
                        "yt-dlp terminated with code {:?}: {:?}",
                        payload.code,
                        last_error
                    );
                    return Err(YtDlpError::DownloadFailed(
                        last_error.unwrap_or_else(|| "Unknown error".to_string()),
                    ));
                }
            }
            _ => {}
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

#[derive(Debug, Clone, serde::Deserialize)]
struct YtDlpTrackMeta {
    id: Option<String>,
    title: Option<String>,
    track: Option<String>,
    uploader: Option<String>,
    artist: Option<String>,
    creator: Option<String>,
    thumbnail: Option<String>,
    duration: Option<f64>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct YtDlpPlaylistMeta {
    id: Option<String>,
    title: Option<String>,
    uploader: Option<String>,
    thumbnail: Option<String>,
    entries: Option<Vec<YtDlpTrackMeta>>,
    playlist_count: Option<u32>,
}

impl From<YtDlpTrackMeta> for TrackInfo {
    fn from(meta: YtDlpTrackMeta) -> Self {
        let artist = meta
            .artist
            .filter(|s| !s.is_empty() && s != "NA")
            .or_else(|| meta.creator.filter(|s| !s.is_empty() && s != "NA"))
            .or_else(|| meta.uploader.filter(|s| !s.is_empty() && s != "NA"))
            .unwrap_or_else(|| "Unknown".to_string());

        let title = meta
            .track
            .filter(|s| !s.is_empty())
            .or(meta.title)
            .unwrap_or_else(|| "Unknown".to_string());

        log::debug!(
            "[ytdlp] Parsed track metadata - artist: {}, title: {}",
            artist,
            title
        );

        TrackInfo {
            id: meta.id.and_then(|s| s.parse().ok()).unwrap_or(0),
            title,
            user: UserInfo { username: artist },
            artwork_url: meta.thumbnail,
            duration: meta.duration.map(|d| (d * 1000.0) as u64).unwrap_or(0),
        }
    }
}

impl From<YtDlpPlaylistMeta> for PlaylistInfo {
    fn from(meta: YtDlpPlaylistMeta) -> Self {
        let tracks: Vec<TrackInfo> = meta
            .entries
            .unwrap_or_default()
            .into_iter()
            .map(TrackInfo::from)
            .collect();
        let track_count = meta.playlist_count.unwrap_or(tracks.len() as u32);

        PlaylistInfo {
            id: meta.id.and_then(|s| s.parse().ok()).unwrap_or(0),
            title: meta.title.unwrap_or_else(|| "Unknown".to_string()),
            user: UserInfo {
                username: meta.uploader.unwrap_or_else(|| "Unknown".to_string()),
            },
            artwork_url: meta.thumbnail,
            track_count,
            tracks,
        }
    }
}

pub async fn extract_playlist_info<R: tauri::Runtime>(
    app: &AppHandle<R>,
    url: &str,
) -> Result<PlaylistInfo, YtDlpError> {
    log::info!("[ytdlp] Extracting playlist info for URL: {}", url);
    let meta: YtDlpPlaylistMeta = run_ytdlp_json(
        app,
        &[
            "--dump-single-json",
            "--flat-playlist",
            "--no-warnings",
            url,
        ],
        "Playlist not found",
    )
    .await?;
    Ok(PlaylistInfo::from(meta))
}

pub async fn extract_track_info<R: tauri::Runtime>(
    app: &AppHandle<R>,
    url: &str,
) -> Result<TrackInfo, YtDlpError> {
    log::info!("[ytdlp] Extracting track info for URL: {}", url);
    let meta: YtDlpTrackMeta = run_ytdlp_json(
        app,
        &["--dump-json", "--no-warnings", url],
        "Track not found",
    )
    .await?;
    log::debug!("[ytdlp] Parsed metadata: {:?}", meta);
    Ok(TrackInfo::from(meta))
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
        let template = build_output_template(&output_dir, &None);
        assert_eq!(template, "/downloads/%(artist)s - %(title)s.%(ext)s");
    }

    #[test]
    fn test_build_output_template_playlist_single_digit() {
        let output_dir = PathBuf::from("/downloads");
        let ctx = Some(PlaylistContext {
            track_position: 1,
            total_tracks: 5,
        });
        let template = build_output_template(&output_dir, &ctx);
        assert_eq!(
            template,
            "/downloads/%(playlist_index)01d - %(artist)s - %(title)s.%(ext)s"
        );
    }

    #[test]
    fn test_build_output_template_playlist_double_digit() {
        let output_dir = PathBuf::from("/downloads");
        let ctx = Some(PlaylistContext {
            track_position: 5,
            total_tracks: 47,
        });
        let template = build_output_template(&output_dir, &ctx);
        assert_eq!(
            template,
            "/downloads/%(playlist_index)02d - %(artist)s - %(title)s.%(ext)s"
        );
    }

    #[test]
    fn test_build_output_template_playlist_triple_digit() {
        let output_dir = PathBuf::from("/downloads");
        let ctx = Some(PlaylistContext {
            track_position: 1,
            total_tracks: 150,
        });
        let template = build_output_template(&output_dir, &ctx);
        assert_eq!(
            template,
            "/downloads/%(playlist_index)03d - %(artist)s - %(title)s.%(ext)s"
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
}
