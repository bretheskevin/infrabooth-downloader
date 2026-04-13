use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;
use tauri_plugin_shell::process::CommandChild;
use tokio::sync::{watch, Mutex};

use crate::models::error::DownloadError;
use crate::services::downloader::{download_track_to_mp3, PlaylistContext};
use crate::services::metadata::{embed_metadata, TrackMetadata};

/// Handles for cancellation support during download.
/// Groups the cancel signal receiver and process tracking handles.
pub struct CancellationHandles {
    pub cancel_rx: watch::Receiver<bool>,
    pub active_child: Arc<Mutex<Option<CommandChild>>>,
    pub active_pid: Arc<Mutex<Option<u32>>>,
}

/// Configuration for the full download pipeline.
pub struct PipelineConfig {
    pub track_url: String,
    pub track_id: String,
    pub output_dir: PathBuf,
    pub metadata: TrackMetadata,
    /// Playlist context for track numbering (None for single tracks)
    pub playlist_context: Option<PlaylistContext>,
    /// Track duration in milliseconds
    pub duration_ms: u64,
    /// OAuth token for private tracks
    pub oauth_token: Option<String>,
    /// URL to download original file (if artist enabled free download)
    pub download_url: Option<String>,
}

/// Download a track and convert it to MP3.
///
/// Resolves the stream URL via SoundCloud API v2, downloads and converts
/// to MP3 using ffmpeg, then embeds ID3 metadata.
///
/// Progress events are emitted via the `download-progress` event channel.
///
/// # Returns
/// The path to the final MP3 file on success.
pub async fn download_and_convert<R: tauri::Runtime>(
    app: &AppHandle<R>, config: PipelineConfig, cancellation: Option<CancellationHandles>,
) -> Result<PathBuf, DownloadError> {
    let playlist_context = config.playlist_context.clone();

    let output_path = download_track_to_mp3(app, &config, cancellation).await?;

    // Prefix metadata title with track number for playlist tracks
    let mut metadata = config.metadata;
    if let Some(ctx) = playlist_context {
        let width = if ctx.total_tracks < 10 {
            1
        } else if ctx.total_tracks < 100 {
            2
        } else {
            3
        };
        metadata.title = format!("{:0width$} - {}", ctx.track_position, metadata.title, width = width);
    }

    // Embed metadata (graceful degradation - log errors but don't fail)
    if let Err(e) = embed_metadata(&output_path, metadata).await {
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
            track_id: None,
        };

        let config = PipelineConfig {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),

            output_dir: PathBuf::from("/tmp/output"),
            metadata,
            playlist_context: None,
            duration_ms: 180000,
            oauth_token: None,
            download_url: None,
        };

        assert_eq!(config.track_url, "https://soundcloud.com/test/track");
        assert_eq!(config.track_id, "123456");
        assert_eq!(config.output_dir, PathBuf::from("/tmp/output"));
        assert_eq!(config.metadata.title, "Track Name");
        assert_eq!(config.metadata.artist, "Artist");
        assert!(config.playlist_context.is_none());
    }

    #[test]
    fn test_pipeline_config_with_playlist_context() {
        let metadata = TrackMetadata {
            title: "Title".to_string(),
            artist: "Artist".to_string(),
            album: Some("Playlist Name".to_string()),
            track_number: Some(5),
            total_tracks: Some(20),
            artwork_url: None,
            track_id: None,
        };

        let config = PipelineConfig {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),

            output_dir: PathBuf::from("/tmp/output"),
            metadata,
            playlist_context: Some(PlaylistContext { track_position: 5, total_tracks: 20 }),
            duration_ms: 240000,
            oauth_token: None,
            download_url: None,
        };

        assert!(config.playlist_context.is_some());
        let ctx = config.playlist_context.unwrap();
        assert_eq!(ctx.track_position, 5);
        assert_eq!(ctx.total_tracks, 20);
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
            track_id: None,
        };

        let config = PipelineConfig {
            track_url: "https://soundcloud.com/test/track".to_string(),
            track_id: "123456".to_string(),

            output_dir: PathBuf::from("/tmp/output"),
            metadata,
            playlist_context: None,
            duration_ms: 180000,
            oauth_token: None,
            download_url: None,
        };

        assert!(config.metadata.album.is_none());
        assert!(config.metadata.track_number.is_none());
        assert!(config.metadata.artwork_url.is_none());
    }
}
