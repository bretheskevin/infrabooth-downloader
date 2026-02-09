use std::path::PathBuf;
use tauri::AppHandle;

use crate::models::error::PipelineError;
use crate::services::metadata::{embed_metadata, TrackMetadata};
use crate::services::ytdlp::{download_track_to_mp3, TrackDownloadToMp3Config};

/// Configuration for the full download pipeline.
pub struct PipelineConfig {
    pub track_url: String,
    pub track_id: String,
    pub output_dir: PathBuf,
    pub filename: String,  // Without extension
    pub metadata: TrackMetadata,
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

    // Embed metadata (graceful degradation - log errors but don't fail)
    if let Err(e) = embed_metadata(&output_path, config.metadata).await {
        log::warn!("Metadata embedding failed: {}", e);
        // Continue - file without metadata is still playable
    }

    Ok(output_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipeline_config_creation() {
        let metadata = TrackMetadata {
            title: "Track Name".to_string(),
            artist: "Artist".to_string(),
            album: Some("Album".to_string()),
            track_number: Some(1),
            total_tracks: Some(10),
            artwork_url: Some("https://example.com/art.jpg".to_string()),
        };

        let config = PipelineConfig {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),
            output_dir: PathBuf::from("/tmp/output"),
            filename: "Artist - Track Name".to_string(),
            metadata,
        };

        assert_eq!(config.track_url, "https://soundcloud.com/test/track");
        assert_eq!(config.track_id, "123456");
        assert_eq!(config.output_dir, PathBuf::from("/tmp/output"));
        assert_eq!(config.filename, "Artist - Track Name");
        assert_eq!(config.metadata.title, "Track Name");
        assert_eq!(config.metadata.artist, "Artist");
    }

    #[test]
    fn test_pipeline_config_with_minimal_metadata() {
        let metadata = TrackMetadata {
            title: "Title".to_string(),
            artist: "Artist".to_string(),
            album: None,
            track_number: None,
            total_tracks: None,
            artwork_url: None,
        };

        let config = PipelineConfig {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),
            output_dir: PathBuf::from("/tmp/output"),
            filename: "Artist - Title".to_string(),
            metadata,
        };

        assert!(config.metadata.album.is_none());
        assert!(config.metadata.track_number.is_none());
        assert!(config.metadata.artwork_url.is_none());
    }
}
