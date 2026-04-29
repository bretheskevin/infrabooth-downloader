use crate::models::artist::ArtistPlaylist;
use crate::services::http::{build_sc_paginated_url, fetch_all_pages, API_V2_BASE, DEFAULT_PAGE_SIZE};

pub async fn fetch_artist_playlists<F>(
    client_id: &str, token: Option<&str>, datadome: Option<&str>, artist_id: u64, on_batch: F,
) -> Result<Vec<ArtistPlaylist>, String>
where
    F: Fn(&[ArtistPlaylist]),
{
    let initial_url = build_sc_paginated_url(&format!("{}/users/{}/playlists_without_albums", API_V2_BASE, artist_id), client_id)?;

    fetch_all_pages(
        initial_url.to_string(),
        token,
        datadome,
        &format!("artist_playlists:user_{}", artist_id),
        DEFAULT_PAGE_SIZE,
        |raw: RawPlaylistItem| Some(raw.into_artist_playlist()),
        on_batch,
    )
    .await
}

#[derive(serde::Deserialize)]
struct RawPlaylistItem {
    #[serde(flatten)]
    base: ArtistPlaylist,
    #[serde(default)]
    tracks: Vec<RawPlaylistTrack>,
}

#[derive(serde::Deserialize)]
struct RawPlaylistTrack {
    artwork_url: Option<String>,
}

impl RawPlaylistItem {
    fn into_artist_playlist(mut self) -> ArtistPlaylist {
        if self.base.artwork_url.is_none() {
            self.base.artwork_url = self.tracks.iter().find_map(|t| t.artwork_url.clone());
        }
        self.base
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_raw(id: u64, title: &str, artwork_url: Option<&str>, tracks: Vec<RawPlaylistTrack>) -> RawPlaylistItem {
        RawPlaylistItem {
            base: ArtistPlaylist {
                id,
                title: title.into(),
                artwork_url: artwork_url.map(Into::into),
                track_count: tracks.len() as u32,
                created_at: "2026-01-01T00:00:00Z".into(),
                permalink_url: format!("https://soundcloud.com/user/sets/{}", title.to_lowercase().replace(' ', "-")),
                secret_token: None,
            },
            tracks,
        }
    }

    #[test]
    fn artwork_falls_back_to_first_track() {
        let raw =
            make_raw(1, "No Art", None, vec![RawPlaylistTrack { artwork_url: None }, RawPlaylistTrack { artwork_url: Some("https://track2.jpg".into()) }]);
        assert_eq!(raw.into_artist_playlist().artwork_url, Some("https://track2.jpg".into()));
    }

    #[test]
    fn own_artwork_takes_precedence() {
        let raw = make_raw(2, "Has Art", Some("https://playlist.jpg"), vec![RawPlaylistTrack { artwork_url: Some("https://track.jpg".into()) }]);
        assert_eq!(raw.into_artist_playlist().artwork_url, Some("https://playlist.jpg".into()));
    }

    #[test]
    fn no_artwork_anywhere_returns_none() {
        let raw = make_raw(3, "Empty", None, vec![]);
        assert_eq!(raw.into_artist_playlist().artwork_url, None);
    }
}
