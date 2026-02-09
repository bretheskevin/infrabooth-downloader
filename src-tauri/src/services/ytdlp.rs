use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::models::error::YtDlpError;
use crate::services::storage::load_tokens;

/// Configuration for downloading a track directly to final MP3 output.
pub struct TrackDownloadToMp3Config {
    pub track_url: String,
    pub track_id: String,
    pub output_dir: PathBuf,
    pub filename: String,
}

/// Progress update from yt-dlp.
#[derive(Debug, Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub percent: f32,
    pub speed: Option<String>,
    pub eta: Option<String>,
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

/// Download a track directly to MP3 format using yt-dlp with OAuth authentication.
///
/// This function downloads and converts to MP3 in a single step using yt-dlp's
/// built-in conversion with 320kbps bitrate. Progress events are emitted via
/// Tauri events to the frontend.
pub async fn download_track_to_mp3<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: TrackDownloadToMp3Config,
) -> Result<PathBuf, YtDlpError> {
    let tokens = load_tokens()
        .map_err(|_| YtDlpError::AuthRequired)?
        .ok_or(YtDlpError::AuthRequired)?;

    let output_path = config.output_dir.join(format!("{}.mp3", config.filename));

    let output_str = output_path
        .to_str()
        .ok_or(YtDlpError::DownloadFailed("Invalid output path".to_string()))?;

    let args = vec![
        "--no-playlist".to_string(),
        "-x".to_string(),
        "--audio-format".to_string(),
        "mp3".to_string(),
        "--audio-quality".to_string(),
        "320K".to_string(),
        "--add-header".to_string(),
        format!("Authorization: OAuth {}", tokens.access_token),
        "-o".to_string(),
        output_str.to_string(),
        "--newline".to_string(),
        config.track_url.clone(),
    ];

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
                log::debug!("yt-dlp stderr: {}", line);
                last_error = Some(line.clone());

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

    if !output_path.exists() {
        return Err(YtDlpError::DownloadFailed(
            "Output file was not created".to_string(),
        ));
    }

    Ok(output_path)
}

/// Get the yt-dlp version.
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

fn bytes_to_string(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
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
