use id3::{frame::Picture, Tag, TagLike, Version};
use std::path::Path;

use crate::models::error::MetadataError;

/// Metadata to embed in a downloaded track.
#[derive(Debug, Clone)]
pub struct TrackMetadata {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub track_number: Option<u32>,
    pub total_tracks: Option<u32>,
    pub artwork_url: Option<String>,
}

/// Embed metadata (ID3 tags) into an MP3 file.
///
/// Writes ID3v2.4 tags including title, artist, album, track number,
/// and artwork (downloaded from URL if provided).
///
/// # Arguments
/// * `file_path` - Path to the MP3 file
/// * `metadata` - Track metadata to embed
///
/// # Returns
/// Ok(()) on success, or MetadataError on failure.
///
/// # Graceful Degradation
/// This function is designed for graceful degradation - callers should
/// log errors but not fail the overall download if metadata embedding fails.
pub async fn embed_metadata(
    file_path: &Path,
    metadata: TrackMetadata,
) -> Result<(), MetadataError> {
    let mut tag = Tag::new();

    // Set basic metadata
    tag.set_title(&metadata.title);
    tag.set_artist(&metadata.artist);

    if let Some(album) = &metadata.album {
        tag.set_album(album);
    }

    if let Some(track_num) = metadata.track_number {
        tag.set_track(track_num);
    }

    if let Some(total) = metadata.total_tracks {
        tag.set_total_tracks(total);
    }

    // Download and embed artwork
    if let Some(artwork_url) = &metadata.artwork_url {
        match download_artwork(artwork_url).await {
            Ok(artwork_data) => {
                let picture = Picture {
                    mime_type: "image/jpeg".to_string(),
                    picture_type: id3::frame::PictureType::CoverFront,
                    description: "Cover".to_string(),
                    data: artwork_data,
                };
                tag.add_frame(picture);
            }
            Err(e) => {
                // Log but continue - artwork is optional
                log::warn!("Failed to download artwork: {}", e);
            }
        }
    }

    // Write tag to file
    tag.write_to_path(file_path, Version::Id3v24)
        .map_err(|e| MetadataError::WriteFailed(e.to_string()))?;

    Ok(())
}

/// Download artwork from URL, using higher resolution variant.
///
/// SoundCloud artwork URLs support resolution suffixes:
/// - `-large`: 100x100 (default)
/// - `-t300x300`: 300x300
/// - `-t500x500`: 500x500 (used here)
/// - `-original`: Original size (may be huge)
async fn download_artwork(url: &str) -> Result<Vec<u8>, MetadataError> {
    // Use higher resolution artwork (500x500 for quality without excessive size)
    let hq_url = url.replace("-large", "-t500x500");

    let response = reqwest::get(&hq_url)
        .await
        .map_err(|e| MetadataError::ArtworkFailed(e.to_string()))?;

    if !response.status().is_success() {
        return Err(MetadataError::ArtworkFailed(format!(
            "HTTP {}",
            response.status()
        )));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| MetadataError::ArtworkFailed(e.to_string()))?;

    Ok(bytes.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn create_minimal_mp3() -> Vec<u8> {
        // Minimal valid MP3 frame (silent)
        // This is a minimal MP3 file that id3 can write tags to
        vec![
            0xFF, 0xFB, 0x90, 0x00, // MP3 frame header (MPEG Audio Layer 3)
            0x00, 0x00, 0x00, 0x00, // Padding
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
        ]
    }

    #[tokio::test]
    async fn test_embed_metadata_basic() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.mp3");

        // Create a minimal MP3 file
        fs::write(&file_path, create_minimal_mp3()).unwrap();

        let metadata = TrackMetadata {
            title: "Test Track".to_string(),
            artist: "Test Artist".to_string(),
            album: Some("Test Album".to_string()),
            track_number: Some(5),
            total_tracks: Some(10),
            artwork_url: None,
        };

        let result = embed_metadata(&file_path, metadata).await;
        assert!(result.is_ok());

        // Verify tags were written
        let tag = Tag::read_from_path(&file_path).unwrap();
        assert_eq!(tag.title(), Some("Test Track"));
        assert_eq!(tag.artist(), Some("Test Artist"));
        assert_eq!(tag.album(), Some("Test Album"));
        assert_eq!(tag.track(), Some(5));
        assert_eq!(tag.total_tracks(), Some(10));
    }

    #[tokio::test]
    async fn test_embed_metadata_minimal() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.mp3");

        fs::write(&file_path, create_minimal_mp3()).unwrap();

        let metadata = TrackMetadata {
            title: "Title Only".to_string(),
            artist: "Artist Only".to_string(),
            album: None,
            track_number: None,
            total_tracks: None,
            artwork_url: None,
        };

        let result = embed_metadata(&file_path, metadata).await;
        assert!(result.is_ok());

        let tag = Tag::read_from_path(&file_path).unwrap();
        assert_eq!(tag.title(), Some("Title Only"));
        assert_eq!(tag.artist(), Some("Artist Only"));
        assert_eq!(tag.album(), None);
        assert_eq!(tag.track(), None);
    }

    #[tokio::test]
    async fn test_embed_metadata_nonexistent_file() {
        let metadata = TrackMetadata {
            title: "Test".to_string(),
            artist: "Test".to_string(),
            album: None,
            track_number: None,
            total_tracks: None,
            artwork_url: None,
        };

        let result = embed_metadata(Path::new("/nonexistent/path.mp3"), metadata).await;
        assert!(result.is_err());
        match result {
            Err(MetadataError::WriteFailed(_)) => (),
            _ => panic!("Expected WriteFailed error"),
        }
    }

    #[test]
    fn test_track_metadata_clone() {
        let metadata = TrackMetadata {
            title: "Test".to_string(),
            artist: "Artist".to_string(),
            album: Some("Album".to_string()),
            track_number: Some(1),
            total_tracks: Some(10),
            artwork_url: Some("https://example.com/art.jpg".to_string()),
        };

        let cloned = metadata.clone();
        assert_eq!(cloned.title, metadata.title);
        assert_eq!(cloned.artist, metadata.artist);
        assert_eq!(cloned.album, metadata.album);
    }
}
