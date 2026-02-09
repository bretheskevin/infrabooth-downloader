use std::path::PathBuf;
use tauri::AppHandle;

use crate::models::error::PipelineError;
use crate::services::ytdlp::{download_track_to_mp3, TrackDownloadToMp3Config};

/// Configuration for the full download pipeline.
pub struct PipelineConfig {
    pub track_url: String,
    pub track_id: String,
    pub output_dir: PathBuf,
    pub filename: String,  // Without extension
}

/// Download a track and convert it to MP3.
///
/// This function uses yt-dlp's built-in MP3 conversion with 320kbps bitrate.
/// Progress events are emitted via the `download-progress` event channel.
///
/// # Arguments
/// * `app` - Tauri app handle for sidecar access and event emission
/// * `config` - Pipeline configuration
///
/// # Returns
/// The path to the final MP3 file on success.
pub async fn download_and_convert<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: PipelineConfig,
) -> Result<PathBuf, PipelineError> {
    let download_config = TrackDownloadToMp3Config {
        track_url: config.track_url,
        track_id: config.track_id,
        output_dir: config.output_dir,
        filename: config.filename,
    };

    let output_path = download_track_to_mp3(app, download_config)
        .await
        .map_err(PipelineError::Download)?;

    Ok(output_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipeline_config_creation() {
        let config = PipelineConfig {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),
            output_dir: PathBuf::from("/tmp/output"),
            filename: "Artist - Track Name".to_string(),
        };

        assert_eq!(config.track_url, "https://soundcloud.com/test/track");
        assert_eq!(config.track_id, "123456");
        assert_eq!(config.output_dir, PathBuf::from("/tmp/output"));
        assert_eq!(config.filename, "Artist - Track Name");
    }
}
