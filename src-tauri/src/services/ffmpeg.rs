use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::models::error::FfmpegError;

/// Configuration for an FFmpeg conversion operation.
pub struct ConversionConfig {
    pub input_path: PathBuf,
    pub output_path: PathBuf,
    pub bitrate: Option<String>, // e.g., "320k"
}

/// Progress update from FFmpeg.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConversionProgress {
    pub percent: f32,
    pub speed: Option<String>,
}

/// Convert bytes to string, handling UTF-8 encoding.
fn bytes_to_string(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

/// Convert audio to MP3 using FFmpeg.
///
/// # Arguments
/// * `app` - Tauri app handle for sidecar access
/// * `config` - Conversion configuration
/// * `progress_channel` - Optional channel for progress updates
///
/// # Returns
/// The path to the converted file on success.
pub async fn convert_to_mp3<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    config: ConversionConfig,
    progress_channel: Option<Channel<ConversionProgress>>,
) -> Result<PathBuf, FfmpegError> {
    let input_str = config
        .input_path
        .to_str()
        .ok_or_else(|| FfmpegError::InvalidInput("Invalid input path".to_string()))?;

    let output_str = config
        .output_path
        .to_str()
        .ok_or_else(|| FfmpegError::OutputError("Invalid output path".to_string()))?;

    let bitrate = config.bitrate.unwrap_or_else(|| "320k".to_string());

    let args = vec![
        "-i",
        input_str,
        "-vn",           // No video
        "-acodec",
        "libmp3lame",    // MP3 codec
        "-ab",
        &bitrate,        // Audio bitrate
        "-ar",
        "44100",         // Sample rate
        "-y",            // Overwrite output
        "-progress",
        "pipe:1",        // Progress to stdout
        output_str,
    ];

    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("ffmpeg")
        .map_err(|_| FfmpegError::BinaryNotFound)?
        .args(&args)
        .spawn()
        .map_err(|_| FfmpegError::BinaryNotFound)?;

    let mut duration: Option<f32> = None;
    let mut last_error: Option<String> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                // Parse progress output from FFmpeg
                if let Some((progress, speed)) = parse_progress(&line, duration) {
                    if let Some(ref channel) = progress_channel {
                        let _ = channel.send(ConversionProgress {
                            percent: progress,
                            speed,
                        });
                    }
                }
                // Try to extract duration from progress output
                if line.starts_with("duration=") {
                    duration = parse_duration_from_progress(&line[9..]);
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                // FFmpeg outputs info to stderr (normal behavior)
                // Parse duration from stderr if needed
                if line.contains("Duration:") {
                    duration = parse_duration_from_stderr(&line);
                }
                // Store potential error messages
                if line.contains("Error") || line.contains("error") {
                    last_error = Some(line.clone());
                }
                log::debug!("ffmpeg stderr: {}", line);
            }
            CommandEvent::Terminated(payload) => {
                if payload.code != Some(0) {
                    log::error!(
                        "ffmpeg terminated with code {:?}: {:?}",
                        payload.code,
                        last_error
                    );
                    return Err(FfmpegError::ConversionFailed(
                        last_error.unwrap_or_else(|| "Unknown error".to_string()),
                    ));
                }
            }
            _ => {}
        }
    }

    // Clean up input file after successful conversion
    if let Err(e) = std::fs::remove_file(&config.input_path) {
        log::warn!("Failed to remove input file: {}", e);
    }

    Ok(config.output_path)
}

/// Get the FFmpeg version.
///
/// # Returns
/// The version string from FFmpeg.
pub async fn get_version<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<String, FfmpegError> {
    let shell = app.shell();
    let (mut rx, _child) = shell
        .sidecar("ffmpeg")
        .map_err(|_| FfmpegError::BinaryNotFound)?
        .args(["-version"])
        .spawn()
        .map_err(|_| FfmpegError::BinaryNotFound)?;

    let mut version = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = bytes_to_string(&line_bytes);
                // First line contains version info
                if version.is_empty() {
                    version = line.trim().to_string();
                }
            }
            CommandEvent::Terminated(payload) => {
                if payload.code != Some(0) {
                    return Err(FfmpegError::BinaryNotFound);
                }
            }
            _ => {}
        }
    }

    if version.is_empty() {
        return Err(FfmpegError::BinaryNotFound);
    }

    Ok(version)
}

/// Parse FFmpeg progress output.
///
/// FFmpeg with `-progress pipe:1` outputs key=value pairs like:
/// ```text
/// out_time_ms=123456
/// speed=1.23x
/// progress=continue
/// ```
fn parse_progress(line: &str, duration: Option<f32>) -> Option<(f32, Option<String>)> {
    if line.starts_with("out_time_ms=") {
        if let Ok(ms) = line[12..].trim().parse::<i64>() {
            let current_time = ms as f32 / 1_000_000.0;
            if let Some(dur) = duration {
                if dur > 0.0 {
                    let percent = (current_time / dur).min(1.0);
                    return Some((percent, None));
                }
            }
        }
    } else if line.starts_with("speed=") {
        let speed = line[6..].trim().to_string();
        if !speed.is_empty() && speed != "N/A" {
            return Some((0.0, Some(speed)));
        }
    }
    None
}

/// Parse duration from FFmpeg progress output.
///
/// Format: "HH:MM:SS.ms" or microseconds
fn parse_duration_from_progress(s: &str) -> Option<f32> {
    let trimmed = s.trim();
    // Try parsing as HH:MM:SS.ms format
    let parts: Vec<&str> = trimmed.split(':').collect();
    if parts.len() == 3 {
        let hours: f32 = parts[0].parse().ok()?;
        let minutes: f32 = parts[1].parse().ok()?;
        let seconds: f32 = parts[2].parse().ok()?;
        return Some(hours * 3600.0 + minutes * 60.0 + seconds);
    }
    // Try parsing as microseconds
    if let Ok(us) = trimmed.parse::<i64>() {
        return Some(us as f32 / 1_000_000.0);
    }
    None
}

/// Parse duration from FFmpeg stderr output.
///
/// FFmpeg outputs: "Duration: 00:03:45.67, ..."
fn parse_duration_from_stderr(line: &str) -> Option<f32> {
    if let Some(start) = line.find("Duration: ") {
        let after_duration = &line[start + 10..];
        // Find the end of the duration (comma or end of string)
        let end = after_duration.find(',').unwrap_or(after_duration.len());
        let duration_str = &after_duration[..end.min(11)];
        return parse_duration_from_progress(duration_str);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_duration_from_progress_hhmmss() {
        let duration = parse_duration_from_progress("00:03:45.67");
        assert!(duration.is_some());
        let dur = duration.unwrap();
        // 3 minutes 45.67 seconds = 225.67 seconds
        assert!((dur - 225.67).abs() < 0.01);
    }

    #[test]
    fn test_parse_duration_from_progress_microseconds() {
        let duration = parse_duration_from_progress("5000000");
        assert!(duration.is_some());
        let dur = duration.unwrap();
        // 5000000 microseconds = 5 seconds
        assert!((dur - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_duration_from_stderr() {
        let line = "  Duration: 00:03:45.67, start: 0.000000, bitrate: 128 kb/s";
        let duration = parse_duration_from_stderr(line);
        assert!(duration.is_some());
        let dur = duration.unwrap();
        assert!((dur - 225.67).abs() < 0.01);
    }

    #[test]
    fn test_parse_duration_from_stderr_no_duration() {
        let line = "Stream #0:0: Audio: mp3, 44100 Hz";
        let duration = parse_duration_from_stderr(line);
        assert!(duration.is_none());
    }

    #[test]
    fn test_parse_progress_out_time_ms() {
        let duration = Some(10.0);
        let result = parse_progress("out_time_ms=5000000", duration);
        assert!(result.is_some());
        let (percent, _) = result.unwrap();
        assert!((percent - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_parse_progress_no_duration() {
        let result = parse_progress("out_time_ms=5000000", None);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_progress_speed() {
        let result = parse_progress("speed=1.23x", Some(10.0));
        assert!(result.is_some());
        let (_, speed) = result.unwrap();
        assert_eq!(speed, Some("1.23x".to_string()));
    }

    #[test]
    fn test_parse_progress_invalid_line() {
        let result = parse_progress("frame=N/A", Some(10.0));
        assert!(result.is_none());
    }

    #[test]
    fn test_bytes_to_string_valid_utf8() {
        let bytes = b"ffmpeg version 6.1";
        assert_eq!(bytes_to_string(bytes), "ffmpeg version 6.1");
    }

    #[test]
    fn test_bytes_to_string_with_newline() {
        let bytes = b"progress=continue\n";
        assert_eq!(bytes_to_string(bytes), "progress=continue\n");
    }
}
