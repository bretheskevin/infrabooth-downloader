use crate::models::artist::ArtistPlaylist;
use crate::services::http::{build_sc_paginated_url, fetch_all_pages, API_V2_BASE, DEFAULT_PAGE_SIZE};

pub async fn fetch_artist_playlists<F>(
    client_id: &str,
    token: Option<&str>,
    datadome: Option<&str>,
    artist_id: u64,
    on_batch: F,
) -> Result<Vec<ArtistPlaylist>, String>
where
    F: Fn(&[ArtistPlaylist]),
{
    let initial_url = build_sc_paginated_url(
        &format!("{}/users/{}/playlists_without_albums", API_V2_BASE, artist_id),
        client_id,
    )?;

    fetch_all_pages(
        initial_url.to_string(),
        token,
        datadome,
        &format!("artist_playlists:user_{}", artist_id),
        DEFAULT_PAGE_SIZE,
        |p| p,
        on_batch,
    )
    .await
}
