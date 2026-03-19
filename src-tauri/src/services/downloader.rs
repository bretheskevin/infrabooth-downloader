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
use crate::services::events;
use crate::services::pipeline::PipelineConfig;
use crate::services::sidecar::bytes_to_string;

use crate::services::stream::{self, StreamCodec, StreamInfo};

/// Estimate bytes per millisecond for the output MP3 based on source codec.
fn output_bytes_per_ms(codec: &StreamCodec) -> u64 {
    match codec {
        StreamCodec::Mp3 => 16,      // ~128kbps (SC serves MP3 at 128k), stream-copied
        StreamCodec::Aac => 32,      // 256kbps target output
        StreamCodec::Opus => 16,     // 128kbps target output
        StreamCodec::Unknown => 32,  // 256kbps fallback
    }
}

#[derive(Debug, Clone)]
pub struct PlaylistContext {
    pub track_position: u32,
    pub total_tracks: u32,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct DownloadProgress {
    pub percent: Option<f32>,
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

/// Detected format of an original download file.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OriginalFormat {
    Wav,
    Flac,
    Mp3,
    Aac,
    Unknown,
}

/// Get output bitrate in kbps for an original format conversion.
/// Used for accurate progress estimation during FFmpeg conversion.
fn output_bitrate_kbps(format: OriginalFormat) -> u32 {
    match format {
        OriginalFormat::Wav | OriginalFormat::Flac => 320,
        OriginalFormat::Aac | OriginalFormat::Unknown => 256,
        OriginalFormat::Mp3 => 128, // Won't be used (MP3 is copied directly)
    }
}

/// Detect audio format from HTTP Content-Type header.
fn detect_format_from_content_type(content_type: &str) -> OriginalFormat {
    let ct = content_type.to_lowercase();
    if ct.contains("audio/wav") || ct.contains("audio/x-wav") || ct.contains("audio/vnd.wave") {
        OriginalFormat::Wav
    } else if ct.contains("audio/flac") || ct.contains("audio/x-flac") {
        OriginalFormat::Flac
    } else if ct.contains("audio/mpeg") || ct.contains("audio/mp3") {
        OriginalFormat::Mp3
    } else if ct.contains("audio/aac") || ct.contains("audio/mp4") || ct.contains("audio/x-m4a") {
        OriginalFormat::Aac
    } else {
        OriginalFormat::Unknown
    }
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
            percent: Some(1.0),
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
                percent: Some(percent),
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
                percent: None,
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
                percent: None,
                speed: Some(speed_str.to_string()),
                eta: None,
                total_bytes: None,
                downloaded_bytes: None,
            });
        }
    }

    None
}

/// Classify ffmpeg stderr output into fatal errors that should abort immediately.
///
/// Only returns errors for conditions where FFmpeg cannot recover (HTTP errors, network failures,
/// disk full). Recoverable warnings (e.g. corrupt AAC frames) are NOT classified here — they are
/// stored in `last_error` and only used if FFmpeg ultimately exits with a non-zero code.
pub fn classify_ffmpeg_error(stderr: &str) -> Option<DownloadError> {
    let lower = stderr.to_lowercase();

    if lower.contains("403 forbidden") || lower.contains("server returned 403") {
        return Some(DownloadError::GeoBlocked("Access forbidden".to_string()));
    }
    if lower.contains("429") || lower.contains("rate limit") {
        return Some(DownloadError::RateLimited(None));
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

    None
}

/// Classify the final stderr output after FFmpeg has terminated with a non-zero exit code.
/// This is more aggressive than `classify_ffmpeg_error` since we know the process failed.
///
/// Messages like "invalid data found" and "conversion failed" are intentionally only matched
/// here (not in `classify_ffmpeg_error`) because they are often recoverable warnings
/// (e.g. corrupt AAC frames that FFmpeg can skip). They only become fatal when FFmpeg
/// actually exits with a non-zero code.
pub fn classify_ffmpeg_exit_error(stderr: &str) -> DownloadError {
    let lower = stderr.to_lowercase();

    if lower.contains("invalid data found") || lower.contains("conversion failed") {
        return DownloadError::ConversionFailed("Audio conversion failed".to_string());
    }

    DownloadError::DownloadFailed(stderr.to_string())
}

/// Build FFmpeg command arguments based on stream codec and output path.
fn build_ffmpeg_args(stream_info: &StreamInfo, output_path: &Path) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    // Input
    args.extend_from_slice(&["-i".to_string(), stream_info.url.clone()]);

    // Output codec and quality — codec-aware encoding
    match stream_info.codec {
        StreamCodec::Mp3 => {
            // Source is already MP3: stream-copy (no re-encoding, no quality loss)
            args.extend_from_slice(&["-codec:a".to_string(), "copy".to_string()]);
        }
        StreamCodec::Aac | StreamCodec::Unknown => {
            // AAC 256kbps source or unknown: transcode to MP3 256kbps
            args.extend_from_slice(&[
                "-codec:a".to_string(),
                "libmp3lame".to_string(),
                "-b:a".to_string(),
                "256k".to_string(),
            ]);
        }
        StreamCodec::Opus => {
            // Opus ~64kbps: transcode to MP3 128kbps (2x for perceptual parity)
            args.extend_from_slice(&[
                "-codec:a".to_string(),
                "libmp3lame".to_string(),
                "-b:a".to_string(),
                "128k".to_string(),
            ]);
        }
    }

    append_common_ffmpeg_args(&mut args, output_path);
    args
}

/// Build FFmpeg command arguments for converting an original download file.
///
/// - Lossless (WAV/FLAC) → MP3 320kbps (high quality source deserves high bitrate)
/// - MP3 → None (just copy the file, no FFmpeg needed)
/// - AAC/Unknown → MP3 256kbps (match transcoding behavior)
fn build_ffmpeg_args_for_original(
    input_path: &Path,
    output_path: &Path,
    format: OriginalFormat,
) -> Option<Vec<String>> {
    // MP3 files don't need conversion — caller should just copy/rename
    if format == OriginalFormat::Mp3 {
        return None;
    }

    let input_str = input_path.to_string_lossy().to_string();
    let mut args: Vec<String> = Vec::new();

    // Input
    args.extend_from_slice(&["-i".to_string(), input_str]);

    // Output codec and bitrate based on source format
    let bitrate = format!("{}k", output_bitrate_kbps(format));

    args.extend_from_slice(&[
        "-codec:a".to_string(),
        "libmp3lame".to_string(),
        "-b:a".to_string(),
        bitrate,
    ]);

    append_common_ffmpeg_args(&mut args, output_path);
    Some(args)
}

/// Result of a successful original file download.
struct OriginalDownload {
    /// Path to the downloaded temp file
    temp_path: PathBuf,
    /// Detected audio format
    format: OriginalFormat,
}

/// Context for FFmpeg conversion operations.
/// Groups parameters needed for process management and cleanup.
struct FfmpegContext<'a> {
    cancel_rx: &'a Option<watch::Receiver<bool>>,
    active_child: &'a Option<Arc<Mutex<Option<CommandChild>>>>,
    active_pid: &'a Option<Arc<Mutex<Option<u32>>>>,
    output_dir: &'a Path,
    base_name: &'a str,
}

/// Append common FFmpeg output arguments to an args vector.
/// These are shared between stream transcoding and original file conversion.
fn append_common_ffmpeg_args(args: &mut Vec<String>, output_path: &Path) {
    let output_str = output_path.to_string_lossy().to_string();

    // Progress reporting
    args.extend_from_slice(&["-progress".to_string(), "pipe:1".to_string()]);

    // Error verbosity
    args.extend_from_slice(&["-v".to_string(), "error".to_string()]);

    // Overwrite
    args.push("-y".to_string());

    // Output file
    args.push(output_str);
}

/// Attempt to download the original file from SoundCloud's download endpoint.
///
/// Returns the downloaded file path and detected format on success.
/// Returns None on any error — caller should fall back to transcoding.
async fn try_original_download(
    download_url: &str,
    oauth_token: Option<&str>,
    output_dir: &Path,
    base_name: &str,
) -> Option<OriginalDownload> {
    let client = reqwest::Client::new();

    let mut request = client.get(download_url);
    if let Some(token) = oauth_token {
        request = request.header("Authorization", format!("OAuth {}", token));
    }

    let response = request.send().await.ok()?;
    if !response.status().is_success() {
        log::info!("[downloader] Original download failed: {}", response.status());
        return None;
    }

    // SoundCloud returns JSON with redirectUri pointing to the actual file
    let body = response.bytes().await.ok()?;

    // Try to parse as JSON redirect, otherwise treat as audio
    let (audio_bytes, content_type) = if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&body) {
        let redirect_uri = json.get("redirectUri")?.as_str()?;
        log::info!("[downloader] Following redirect to CDN");

        let audio_resp = client.get(redirect_uri).send().await.ok()?;
        if !audio_resp.status().is_success() {
            return None;
        }

        let ct = audio_resp
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        (audio_resp.bytes().await.ok()?, ct)
    } else {
        log::debug!("[downloader] Original download response was not JSON redirect, skipping");
        return None;
    };

    let format = detect_format_from_content_type(&content_type);

    let extension = match format {
        OriginalFormat::Wav => "wav",
        OriginalFormat::Flac => "flac",
        OriginalFormat::Mp3 => "mp3",
        OriginalFormat::Aac => "m4a",
        OriginalFormat::Unknown => "bin",
    };

    let temp_path = output_dir.join(format!("{}.original.{}", base_name, extension));
    std::fs::write(&temp_path, &audio_bytes).ok()?;

    log::info!(
        "[downloader] Downloaded original: {:?} ({:?}, {} bytes)",
        temp_path, format, audio_bytes.len()
    );

    Some(OriginalDownload { temp_path, format })
}

/// Convert an original download file to MP3, or copy if already MP3.
///
/// Returns the final output path on success.
async fn convert_original_file<R: tauri::Runtime>(
    app: &AppHandle<R>,
    original: &OriginalDownload,
    output_file: &Path,
    track_id: &str,
    duration_ms: u64,
    ctx: &FfmpegContext<'_>,
) -> Result<PathBuf, DownloadError> {
    // MP3 files: just rename, no conversion needed
    if original.format == OriginalFormat::Mp3 {
        std::fs::rename(&original.temp_path, output_file).map_err(|e| {
            DownloadError::ConversionFailed(format!("Failed to move MP3 file: {}", e))
        })?;
        log::info!("[downloader] Original MP3 copied directly: {:?}", output_file);
        return Ok(output_file.to_path_buf());
    }

    // Build FFmpeg args for conversion
    let args = build_ffmpeg_args_for_original(&original.temp_path, output_file, original.format)
        .expect("Non-MP3 format should always produce args");

    // Calculate bytes per ms for progress estimation based on actual output bitrate
    let bytes_per_ms = (output_bitrate_kbps(original.format) / 8) as u64;

    // Run conversion
    let result = run_ffmpeg_sidecar(
        app,
        &args,
        track_id,
        duration_ms,
        bytes_per_ms,
        output_file,
        ctx,
    )
    .await;

    // Always clean up temp file (on success or error)
    let _ = std::fs::remove_file(&original.temp_path);

    // Propagate any error after cleanup
    result?;

    log::info!(
        "[downloader] Converted original {:?} to MP3: {:?}",
        original.format,
        output_file
    );

    Ok(output_file.to_path_buf())
}

/// Check if cancellation has been requested.
fn is_cancelled(cancel_rx: &Option<watch::Receiver<bool>>) -> bool {
    cancel_rx.as_ref().map_or(false, |crx| *crx.borrow())
}

/// Kill the active child process and clean up partial files.
async fn cancel_and_cleanup(
    active_child: &Option<Arc<Mutex<Option<CommandChild>>>>,
    output_dir: &Path,
    base_name: &str,
    output_file: &Path,
) {
    if let Some(ref active_child_mutex) = active_child {
        let mut guard = active_child_mutex.lock().await;
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
    cleanup_partial_files(output_dir, base_name);
    let _ = std::fs::remove_file(output_file);
}

/// Process the ffmpeg event loop: handles stdout progress, stderr errors,
/// cancellation, and termination.
async fn run_ffmpeg_event_loop<R: tauri::Runtime>(
    app: &AppHandle<R>,
    rx: &mut tauri::async_runtime::Receiver<CommandEvent>,
    track_id: &str,
    duration_ms: u64,
    bytes_per_ms: u64,
    cancel_rx: &Option<watch::Receiver<bool>>,
    active_child: &Option<Arc<Mutex<Option<CommandChild>>>>,
    output_dir: &Path,
    base_name: &str,
    output_file: &Path,
) -> Result<(), DownloadError> {
    let mut last_error: Option<String> = None;
    let mut last_percent: f32 = 0.0;
    let mut last_downloaded_bytes: Option<u64> = None;
    let estimated_total_bytes: Option<u64> = if duration_ms > 0 {
        Some(duration_ms * bytes_per_ms)
    } else {
        None
    };

    loop {
        if is_cancelled(cancel_rx) {
            log::info!("[downloader] Cancellation detected, aborting download");
            cancel_and_cleanup(active_child, output_dir, base_name, output_file).await;
            return Err(DownloadError::Cancelled);
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

                    if let Some(progress) = parse_ffmpeg_progress(line, duration_ms) {
                        // Update tracking state
                        if let Some(pct) = progress.percent {
                            last_percent = pct;
                        }
                        if progress.downloaded_bytes.is_some() {
                            last_downloaded_bytes = progress.downloaded_bytes;
                        }

                        // Only emit meaningful progress updates
                        if progress.percent.is_some() {
                            let _ = app.emit(
                                events::DOWNLOAD_PROGRESS,
                                DownloadProgressEvent {
                                    track_id: track_id.to_string(),
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
                        track_id,
                        err
                    );
                    return Err(err);
                }
            }
            Some(CommandEvent::Terminated(payload)) => {
                if payload.code != Some(0) {
                    if is_cancelled(cancel_rx) {
                        log::info!("[downloader] Download was cancelled (terminated)");
                        cleanup_partial_files(output_dir, base_name);
                        let _ = std::fs::remove_file(output_file);
                        return Err(DownloadError::Cancelled);
                    }
                    let error_text = last_error.unwrap_or_else(|| "Unknown error".to_string());
                    log::error!(
                        "ffmpeg terminated with code {:?}: {}",
                        payload.code,
                        error_text
                    );
                    let _ = std::fs::remove_file(output_file);
                    return Err(classify_ffmpeg_exit_error(&error_text));
                }
                break;
            }
            Some(_) => {}
            None => break,
        }
    }

    Ok(())
}

/// Spawn FFmpeg sidecar, register process handles, run event loop, and verify output.
/// This is the shared implementation for both stream transcoding and original file conversion.
async fn run_ffmpeg_sidecar<R: tauri::Runtime>(
    app: &AppHandle<R>,
    args: &[String],
    track_id: &str,
    duration_ms: u64,
    bytes_per_ms: u64,
    output_file: &Path,
    ctx: &FfmpegContext<'_>,
) -> Result<(), DownloadError> {
    let shell = app.shell();
    let (mut rx, child) = shell
        .sidecar("ffmpeg")
        .map_err(|_| DownloadError::BinaryNotFound)?
        .args(args)
        .spawn()
        .map_err(|_| DownloadError::BinaryNotFound)?;

    // Store PID for process tree killing
    let pid = child.pid();
    if let Some(ref active_pid_mutex) = ctx.active_pid {
        let mut guard = active_pid_mutex.lock().await;
        *guard = Some(pid);
        log::debug!("[downloader] Stored PID {} for process tree killing", pid);
    }

    if let Some(ref active_child_mutex) = ctx.active_child {
        let mut guard = active_child_mutex.lock().await;
        *guard = Some(child);
    }

    // Run event loop
    run_ffmpeg_event_loop(
        app,
        &mut rx,
        track_id,
        duration_ms,
        bytes_per_ms,
        ctx.cancel_rx,
        ctx.active_child,
        ctx.output_dir,
        ctx.base_name,
        output_file,
    )
    .await?;

    // Verify output file exists
    if !output_file.exists() {
        return Err(DownloadError::ConversionFailed(
            "Output file was not created".to_string(),
        ));
    }

    Ok(())
}

pub async fn download_track_to_mp3<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: &PipelineConfig,
    active_child: Option<Arc<Mutex<Option<CommandChild>>>>,
    cancel_rx: Option<watch::Receiver<bool>>,
    active_pid: Option<Arc<Mutex<Option<u32>>>>,
) -> Result<PathBuf, DownloadError> {
    // Build output filename
    let (base_name, _display_title) =
        build_base_filename(&config.playlist_context, &config.metadata.artist, &config.metadata.title);
    let output_file = config.output_dir.join(format!("{}.mp3", base_name));

    // Check if already downloaded
    if output_file.exists() {
        log::info!("[downloader] File already exists: {:?}", output_file);
        return Ok(output_file);
    }

    // Create shared context for FFmpeg operations
    let ctx = FfmpegContext {
        cancel_rx: &cancel_rx,
        active_child: &active_child,
        active_pid: &active_pid,
        output_dir: &config.output_dir,
        base_name: &base_name,
    };

    // Try original download first (if available)
    if let Some(ref download_url) = config.download_url {
        log::info!("[downloader] Attempting original download for track {}", config.track_id);

        if let Some(original) = try_original_download(
            download_url,
            config.oauth_token.as_deref(),
            &config.output_dir,
            &base_name,
        )
        .await
        {
            return convert_original_file(
                app,
                &original,
                &output_file,
                &config.track_id,
                config.duration_ms,
                &ctx,
            )
            .await;
        }
        // Fall through to transcoding on failure
        log::info!("[downloader] Original download unavailable, using transcoding stream");
    }

    // Existing transcoding path
    let stream_info = stream::resolve_stream_url(&config.track_url, config.oauth_token.as_deref()).await?;

    log::info!("[downloader] Resolved stream URL for track {}", config.track_id);
    log::info!(
        "[downloader] Encoding strategy for track {}: codec={:?}",
        config.track_id,
        stream_info.codec
    );

    // Build ffmpeg args and run conversion
    let args = build_ffmpeg_args(&stream_info, &output_file);
    let bytes_per_ms = output_bytes_per_ms(&stream_info.codec);

    run_ffmpeg_sidecar(
        app,
        &args,
        &config.track_id,
        config.duration_ms,
        bytes_per_ms,
        &output_file,
        &ctx,
    )
    .await?;

    log::info!("[downloader] Download complete: {:?}", output_file);
    Ok(output_file)
}

#[cfg(test)]
mod tests {
    use super::*;

    // parse_ffmpeg_progress tests

    #[test]
    fn test_parse_ffmpeg_progress_basic() {
        let progress = parse_ffmpeg_progress("out_time_us=5000000", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert!((p.percent.unwrap() - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_parse_ffmpeg_progress_complete() {
        let progress = parse_ffmpeg_progress("progress=end", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert!((p.percent.unwrap() - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_parse_ffmpeg_progress_speed() {
        let progress = parse_ffmpeg_progress("speed=2.5x", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert_eq!(p.speed, Some("2.5x".to_string()));
        assert!(p.percent.is_none());
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
        assert!(p.percent.is_none());
    }

    #[test]
    fn test_parse_ffmpeg_progress_unrecognized_line() {
        assert!(parse_ffmpeg_progress("bitrate=320.0kbits/s", 10000).is_none());
        assert!(parse_ffmpeg_progress("", 10000).is_none());
    }

    #[test]
    fn test_parse_ffmpeg_progress_caps_at_100_percent() {
        let progress = parse_ffmpeg_progress("out_time_us=20000000", 10000);
        assert!(progress.is_some());
        let p = progress.unwrap();
        assert!((p.percent.unwrap() - 1.0).abs() < 0.01);
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
        assert!(matches!(err, Some(DownloadError::RateLimited(_))));
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
    fn test_classify_ffmpeg_error_invalid_data_not_fatal() {
        let err = classify_ffmpeg_error("Invalid data found when processing input");
        assert!(err.is_none());
    }

    #[test]
    fn test_classify_ffmpeg_exit_error_invalid_data() {
        let err = classify_ffmpeg_exit_error("Invalid data found when processing input");
        assert!(matches!(err, DownloadError::ConversionFailed(_)));
    }

    #[test]
    fn test_classify_ffmpeg_exit_error_unknown() {
        let err = classify_ffmpeg_exit_error("some unknown error");
        assert!(matches!(err, DownloadError::DownloadFailed(_)));
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

    // output_bytes_per_ms tests

    #[test]
    fn test_output_bytes_per_ms_mp3() {
        assert_eq!(output_bytes_per_ms(&StreamCodec::Mp3), 16);
    }

    #[test]
    fn test_output_bytes_per_ms_aac() {
        assert_eq!(output_bytes_per_ms(&StreamCodec::Aac), 32);
    }

    #[test]
    fn test_output_bytes_per_ms_opus() {
        assert_eq!(output_bytes_per_ms(&StreamCodec::Opus), 16);
    }

    #[test]
    fn test_output_bytes_per_ms_unknown() {
        assert_eq!(output_bytes_per_ms(&StreamCodec::Unknown), 32);
    }

    // output_bitrate_kbps tests

    #[test]
    fn test_output_bitrate_kbps_lossless() {
        assert_eq!(output_bitrate_kbps(OriginalFormat::Wav), 320);
        assert_eq!(output_bitrate_kbps(OriginalFormat::Flac), 320);
    }

    #[test]
    fn test_output_bitrate_kbps_lossy() {
        assert_eq!(output_bitrate_kbps(OriginalFormat::Aac), 256);
        assert_eq!(output_bitrate_kbps(OriginalFormat::Unknown), 256);
    }

    #[test]
    fn test_output_bitrate_kbps_mp3() {
        assert_eq!(output_bitrate_kbps(OriginalFormat::Mp3), 128);
    }

    #[test]
    fn test_detect_format_from_content_type_wav() {
        assert_eq!(detect_format_from_content_type("audio/wav"), OriginalFormat::Wav);
        assert_eq!(detect_format_from_content_type("audio/x-wav"), OriginalFormat::Wav);
        assert_eq!(detect_format_from_content_type("audio/vnd.wave"), OriginalFormat::Wav);
    }

    #[test]
    fn test_detect_format_from_content_type_flac() {
        assert_eq!(detect_format_from_content_type("audio/flac"), OriginalFormat::Flac);
        assert_eq!(detect_format_from_content_type("audio/x-flac"), OriginalFormat::Flac);
    }

    #[test]
    fn test_detect_format_from_content_type_mp3() {
        assert_eq!(detect_format_from_content_type("audio/mpeg"), OriginalFormat::Mp3);
        assert_eq!(detect_format_from_content_type("audio/mp3"), OriginalFormat::Mp3);
    }

    #[test]
    fn test_detect_format_from_content_type_aac() {
        assert_eq!(detect_format_from_content_type("audio/aac"), OriginalFormat::Aac);
        assert_eq!(detect_format_from_content_type("audio/mp4"), OriginalFormat::Aac);
        assert_eq!(detect_format_from_content_type("audio/x-m4a"), OriginalFormat::Aac);
    }

    #[test]
    fn test_detect_format_from_content_type_unknown() {
        assert_eq!(detect_format_from_content_type("application/octet-stream"), OriginalFormat::Unknown);
        assert_eq!(detect_format_from_content_type("text/html"), OriginalFormat::Unknown);
    }

    #[test]
    fn test_build_ffmpeg_args_for_original_wav() {
        let args = build_ffmpeg_args_for_original(
            Path::new("/tmp/input.wav"),
            Path::new("/tmp/output.mp3"),
            OriginalFormat::Wav,
        );
        assert!(args.is_some());
        let args = args.unwrap();
        assert!(args.contains(&"-b:a".to_string()));
        assert!(args.contains(&"320k".to_string()));
    }

    #[test]
    fn test_build_ffmpeg_args_for_original_flac() {
        let args = build_ffmpeg_args_for_original(
            Path::new("/tmp/input.flac"),
            Path::new("/tmp/output.mp3"),
            OriginalFormat::Flac,
        );
        assert!(args.is_some());
        let args = args.unwrap();
        assert!(args.contains(&"320k".to_string()));
    }

    #[test]
    fn test_build_ffmpeg_args_for_original_mp3() {
        let args = build_ffmpeg_args_for_original(
            Path::new("/tmp/input.mp3"),
            Path::new("/tmp/output.mp3"),
            OriginalFormat::Mp3,
        );
        assert!(args.is_none());
    }

    #[test]
    fn test_build_ffmpeg_args_for_original_aac() {
        let args = build_ffmpeg_args_for_original(
            Path::new("/tmp/input.m4a"),
            Path::new("/tmp/output.mp3"),
            OriginalFormat::Aac,
        );
        assert!(args.is_some());
        let args = args.unwrap();
        assert!(args.contains(&"256k".to_string()));
    }
}
