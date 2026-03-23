use tauri::{AppHandle, Manager};

use crate::commands::require_auth_and_cid;
use crate::services::selections::{fetch_selections, Selection, SelectionCache};

#[tauri::command]
#[specta::specta]
pub async fn get_selections(app: AppHandle) -> Result<Vec<Selection>, String> {
    let cache = app.state::<SelectionCache>();
    if let Some(cached) = cache.get() {
        return Ok(cached);
    }

    let (token, client_id) = require_auth_and_cid(&app).await?;
    let selections = fetch_selections(&token, &client_id)
        .await
        .map_err(|e| e.to_string())?;

    cache.set(selections.clone());
    Ok(selections)
}
