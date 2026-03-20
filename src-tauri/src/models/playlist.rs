use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct PlaylistTrack {
    pub id: u64,
    pub artwork_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PlaylistTracksResponse {
    pub tracks: Vec<PlaylistTrack>,
}

impl PlaylistTracksResponse {
    pub fn first_track_artwork(&self) -> Option<String> {
        self.tracks.iter().find_map(|t| t.artwork_url.clone())
    }
}
