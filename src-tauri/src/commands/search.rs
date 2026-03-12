use crate::models::error::ErrorResponse;
use crate::services::client_id;
use crate::services::search::{self, SearchResponse};

#[tauri::command]
#[specta::specta]
pub async fn search_tracks(
    query: String,
    limit: u32,
    offset: u32,
) -> Result<SearchResponse, ErrorResponse> {
    let client_id = client_id::get_client_id()
        .await
        .map_err(ErrorResponse::from)?;

    search::search_tracks(&client_id, &query, limit, offset)
        .await
        .map_err(ErrorResponse::from)
}
