use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::models::error::YtDlpError;
use crate::services::storage::load_tokens;

/// Configuration for a yt-dlp download operation.
pub struct YtDlpConfig {
    pub url: String,
    pub output_path: PathBuf,
    pub cookies: Option<String>,
    pub format: Option<String>,
}

/// Progress update from yt-dlp.
#[derive(Debug, Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub percent: f32,
    pub speed: Option<String>,
    pub eta: Option<String>,
}

/// Configuration for a track download operation with OAuth authentication.
pub struct TrackDownloadConfig {
    pub track_url: String,
    pub track_id: String,
    pub temp_dir: PathBuf,
}

/// Download progress event payload for frontend communication.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressEvent {
    pub track_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<DownloadErrorPayload>,
}

/// Error payload for download progress events.
#[derive(Debug, Clone, serde::Serialize)]
pub struct DownloadErrorPayload {
    pub code: String,
    pub message: String,
}

/// Download a track using yt-dlp with OAuth authentication.
///
/// This function downloads audio using the user's OAuth token for Go+ quality access.
/// Progress events are emitted via Tauri events to the frontend.
///
/// # Arguments
/// * `app` - Tauri app handle for sidecar access and event emission
/// * `config` - Track download configuration
///
/// # Returns
/// The path to the downloaded file on success.
pub async fn download_track<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: TrackDownloadConfig,
) -> Result<PathBuf, YtDlpError> {
    // Get OAuth token for authentication
    let tokens = load_tokens()
        .map_err(|_| YtDlpError::AuthRequired)?
        .ok_or(YtDlpError::AuthRequired)?;

    // Prepare output path template
    let output_template = config
        .temp_dir
        .join(format!("{}.%(ext)s", config.track_id));

    let output_template_str = output_template
        .to_str()
        .ok_or(YtDlpError::DownloadFailed("Invalid output path".to_string()))?;

    // Build yt-dlp arguments with OAuth authentication
    let args = vec![
        "--no-playlist".to_string(),
        "-x".to_string(),                    // Extract audio
        "--audio-format".to_string(),
        "best".to_string(),
        "--audio-quality".to_string(),
        "0".to_string(),                     // Best quality
        "--add-header".to_string(),
        format!("Authorization: OAuth {}", tokens.access_token),
        "-o".to_string(),
        output_template_str.to_string(),
        "--newline".to_string(),             // Progress on new lines
        config.track_url.clone(),
    ];

    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("yt-dlp")
        .map_err(|_| YtDlpError::BinaryNotFound)?
        .args(&args)
        .spawn()
        .map_err(|_| YtDlpError::BinaryNotFound)?;

    let mut output_path: Option<PathBuf> = None;
    let mut last_error: Option<String> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = bytes_to_string(&line_bytes);

                // Parse and emit progress
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

                // Capture output filename
                if line.contains("[download] Destination:") {
                    let path = line.replace("[download] Destination:", "").trim().to_string();
                    output_path = Some(PathBuf::from(path));
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                log::warn!("yt-dlp stderr: {}", line);
                last_error = Some(line.clone());

                // Check for specific error conditions
                if line.contains("HTTP Error 403") {
                    return Err(YtDlpError::GeoBlocked);
                }
                if line.contains("HTTP Error 429") || line.contains("rate limit") {
                    return Err(YtDlpError::RateLimited);
                }
                if line.contains("HTTP Error 404") {
                    return Err(YtDlpError::NotFound);
                }
                if line.contains("geo") || line.contains("not available in your country") {
                    return Err(YtDlpError::GeoBlocked);
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

    // Find the actual output file (extension determined by yt-dlp)
    let downloaded_file = find_downloaded_file(&config.temp_dir, &config.track_id)?;
    Ok(output_path.unwrap_or(downloaded_file))
}

/// Find the downloaded file in the temp directory by track ID prefix.
fn find_downloaded_file(dir: &PathBuf, track_id: &str) -> Result<PathBuf, YtDlpError> {
    for entry in std::fs::read_dir(dir).map_err(|e| {
        YtDlpError::DownloadFailed(format!("Failed to read temp directory: {}", e))
    })? {
        if let Ok(entry) = entry {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(track_id) {
                return Ok(entry.path());
            }
        }
    }
    Err(YtDlpError::DownloadFailed(format!(
        "Downloaded file not found for track {}",
        track_id
    )))
}

/// Convert bytes to string, handling UTF-8 encoding.
fn bytes_to_string(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

/// Download audio from a URL using yt-dlp.
///
/// # Arguments
/// * `app` - Tauri app handle for sidecar access
/// * `config` - Download configuration
/// * `progress_channel` - Optional channel for progress updates
///
/// # Returns
/// The path to the downloaded file on success.
pub async fn download_audio<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    config: YtDlpConfig,
    progress_channel: Option<Channel<DownloadProgress>>,
) -> Result<PathBuf, YtDlpError> {
    let output_template = config
        .output_path
        .to_str()
        .ok_or(YtDlpError::InvalidUrl)?;

    let mut args = vec![
        "--no-playlist".to_string(),
        "-x".to_string(), // Extract audio
        "--audio-format".to_string(),
        "best".to_string(),
        "--audio-quality".to_string(),
        "0".to_string(), // Best quality
        "-o".to_string(),
        output_template.to_string(),
    ];

    // Add cookies if provided (for authenticated downloads)
    if let Some(ref cookies) = config.cookies {
        args.push("--cookies".to_string());
        args.push(cookies.clone());
    }

    // Add format selection if provided
    if let Some(ref format) = config.format {
        args.push("-f".to_string());
        args.push(format.clone());
    }

    args.push(config.url.clone());

    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("yt-dlp")
        .map_err(|_| YtDlpError::BinaryNotFound)?
        .args(&args)
        .spawn()
        .map_err(|_| YtDlpError::BinaryNotFound)?;

    let mut last_error: Option<String> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                if let Some(progress) = parse_progress(&line) {
                    if let Some(ref channel) = progress_channel {
                        let _ = channel.send(progress);
                    }
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                log::warn!("yt-dlp stderr: {}", line);
                last_error = Some(line.clone());

                // Check for specific error conditions
                if line.contains("429") || line.contains("rate limit") {
                    return Err(YtDlpError::RateLimited);
                }
                if line.contains("geo") || line.contains("not available in your country") {
                    return Err(YtDlpError::GeoBlocked);
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

    Ok(config.output_path)
}

/// Get the yt-dlp version.
///
/// # Returns
/// The version string from yt-dlp.
pub async fn get_version<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<String, YtDlpError> {
    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("yt-dlp")
        .map_err(|_| YtDlpError::BinaryNotFound)?
        .args(["--version"])
        .spawn()
        .map_err(|_| YtDlpError::BinaryNotFound)?;

    let mut version = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                version = line.trim().to_string();
            }
            CommandEvent::Terminated(payload) => {
                if payload.code != Some(0) {
                    return Err(YtDlpError::BinaryNotFound);
                }
            }
            _ => {}
        }
    }

    if version.is_empty() {
        return Err(YtDlpError::BinaryNotFound);
    }

    Ok(version)
}

/// Parse yt-dlp progress output.
///
/// yt-dlp outputs progress like:
/// `[download]  50.0% of 5.00MiB at 1.00MiB/s ETA 00:02`
fn parse_progress(line: &str) -> Option<DownloadProgress> {
    if !line.contains("[download]") || !line.contains('%') {
        return None;
    }

    let parts: Vec<&str> = line.split_whitespace().collect();

    // Find the percentage
    let percent = parts.iter().find_map(|part| {
        if part.ends_with('%') {
            part.trim_end_matches('%').parse::<f32>().ok()
        } else {
            None
        }
    })?;

    // Find speed (usually after "at")
    let speed = parts
        .iter()
        .position(|&p| p == "at")
        .and_then(|i| parts.get(i + 1))
        .map(|s| s.to_string());

    // Find ETA (usually after "ETA")
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
    fn test_bytes_to_string_valid_utf8() {
        let bytes = b"Hello, World!";
        assert_eq!(bytes_to_string(bytes), "Hello, World!");
    }

    #[test]
    fn test_bytes_to_string_with_newline() {
        let bytes = b"2026.02.04\n";
        assert_eq!(bytes_to_string(bytes), "2026.02.04\n");
    }
}
