use crate::models::artist::{ArtistPlaylist, RawArtistPlaylist};
use crate::services::http::{build_sc_paginated_url, fetch_all_pages, API_V2_BASE, DEFAULT_PAGE_SIZE};

async fn fetch_artist_collection<F>(
    endpoint: &str, label: &str, client_id: &str, token: Option<&str>, datadome: Option<&str>, artist_id: u64, on_batch: F,
) -> Result<Vec<ArtistPlaylist>, String>
where
    F: Fn(&[ArtistPlaylist]),
{
    let initial_url = build_sc_paginated_url(&format!("{}/users/{}/{}", API_V2_BASE, artist_id, endpoint), client_id)?;

    fetch_all_pages(
        initial_url.to_string(),
        token,
        datadome,
        &format!("{}:user_{}", label, artist_id),
        DEFAULT_PAGE_SIZE,
        |raw: RawArtistPlaylist| Some(raw.into()),
        on_batch,
    )
    .await
}

pub async fn fetch_artist_playlists<F>(
    client_id: &str, token: Option<&str>, datadome: Option<&str>, artist_id: u64, on_batch: F,
) -> Result<Vec<ArtistPlaylist>, String>
where
    F: Fn(&[ArtistPlaylist]),
{
    fetch_artist_collection("playlists_without_albums", "artist_playlists", client_id, token, datadome, artist_id, on_batch).await
}

pub async fn fetch_artist_albums<F>(
    client_id: &str, token: Option<&str>, datadome: Option<&str>, artist_id: u64, on_batch: F,
) -> Result<Vec<ArtistPlaylist>, String>
where
    F: Fn(&[ArtistPlaylist]),
{
    fetch_artist_collection("albums", "artist_albums", client_id, token, datadome, artist_id, on_batch).await
}
