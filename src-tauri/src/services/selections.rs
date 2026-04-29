use std::sync::Mutex;

use futures::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;

use crate::models::error::ScApiError;
use crate::services::http::{validate_api_response, RequestBuilderExt, API_V2_BASE, HTTP_CLIENT};
use crate::services::playlist::{self, TrackInfo};

#[derive(Debug, Deserialize)]
struct MixedSelectionsResponse {
    collection: Vec<SelectionGroup>,
}

#[derive(Debug, Deserialize)]
struct SelectionGroup {
    items: Option<SelectionItems>,
}

#[derive(Debug, Deserialize)]
struct SelectionItems {
    collection: Vec<SelectionItem>,
}

#[derive(Debug, Deserialize)]
struct SelectionItem {
    urn: Option<String>,
    title: Option<String>,
    short_title: Option<String>,
    artwork_url: Option<String>,
    calculated_artwork_url: Option<String>,
    tracks: Option<Vec<Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Selection {
    pub id: String,
    pub title: String,
    pub short_title: String,
    pub artwork_url: Option<String>,
    pub track_count: u32,
    pub tracks: Vec<TrackInfo>,
}

pub struct SelectionCache {
    inner: Mutex<Option<Vec<Selection>>>,
}

impl Default for SelectionCache {
    fn default() -> Self {
        Self { inner: Mutex::new(None) }
    }
}

impl SelectionCache {
    pub fn get(&self) -> Option<Vec<Selection>> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn set(&self, selections: Vec<Selection>) {
        *self.inner.lock().unwrap_or_else(|e| e.into_inner()) = Some(selections);
    }

    pub fn clear(&self) {
        *self.inner.lock().unwrap_or_else(|e| e.into_inner()) = None;
    }
}

pub async fn fetch_selections(oauth_token: &str, client_id: &str) -> Result<Vec<Selection>, ScApiError> {
    let url = format!("{}/mixed-selections?client_id={}&limit=50&linked_partitioning=1", API_V2_BASE, client_id);

    let response = HTTP_CLIENT.get(&url).with_oauth(Some(oauth_token)).send().await?;

    validate_api_response(response.status())?;
    let body: MixedSelectionsResponse = response.json().await?;

    let mut seen_urns = std::collections::HashSet::new();
    let mut eligible: Vec<_> = body
        .collection
        .into_iter()
        .filter_map(|sel| sel.items)
        .flat_map(|items| items.collection.into_iter())
        .filter(|item| {
            if item.title.is_none() {
                return false;
            }
            match &item.urn {
                Some(urn) => seen_urns.insert(urn.clone()),
                None => true,
            }
        })
        .collect();

    let futures: Vec<_> = eligible
        .iter_mut()
        .map(|item| {
            let tracks_raw = item.tracks.take().unwrap_or_default();
            let cid = client_id.to_owned();
            let token = oauth_token.to_owned();
            async move { playlist::resolve_tracks_from_mixed(&tracks_raw, &cid, Some(&token), |_| {}).await }
        })
        .collect();

    let track_results: Vec<_> = stream::iter(futures).buffered(6).collect().await;

    let mut selections = Vec::with_capacity(eligible.len());
    for (item, result) in eligible.iter().zip(track_results) {
        let tracks = match result {
            Ok(t) => t,
            Err(e) => {
                log::warn!("Failed to resolve tracks for selection {:?}: {}", item.title, e);
                continue;
            }
        };
        if tracks.is_empty() {
            continue;
        }
        let title = item.title.clone().unwrap_or_default();
        selections.push(Selection {
            id: item.urn.clone().unwrap_or_default(),
            short_title: item.short_title.clone().unwrap_or_else(|| title.clone()),
            artwork_url: item.artwork_url.clone().or_else(|| item.calculated_artwork_url.clone()),
            track_count: tracks.len() as u32,
            title,
            tracks,
        });
    }

    Ok(selections)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_get_returns_none_initially() {
        let cache = SelectionCache::default();
        assert!(cache.get().is_none());
    }

    #[test]
    fn test_cache_set_and_get() {
        let cache = SelectionCache::default();
        let selections = vec![Selection {
            id: "test-id".to_string(),
            title: "Test Mix".to_string(),
            short_title: "Test".to_string(),
            artwork_url: None,
            track_count: 0,
            tracks: vec![],
        }];
        cache.set(selections.clone());
        let result = cache.get();
        assert!(result.is_some());
        assert_eq!(result.unwrap().len(), 1);
    }

    #[test]
    fn test_cache_clear() {
        let cache = SelectionCache::default();
        cache.set(vec![]);
        assert!(cache.get().is_some());
        cache.clear();
        assert!(cache.get().is_none());
    }

    #[test]
    fn test_mixed_selections_response_deserializes() {
        let json = serde_json::json!({
            "collection": [
                {
                    "items": {
                        "collection": [
                            {
                                "kind": "system-playlist",
                                "urn": "soundcloud:system-playlists:daily-mix:0",
                                "title": "Daily Mix 1",
                                "short_title": "Mix 1",
                                "artwork_url": "https://example.com/art.jpg",
                                "calculated_artwork_url": null,
                                "tracks": []
                            }
                        ]
                    }
                },
                {
                    "items": null
                }
            ]
        });

        let resp: MixedSelectionsResponse = serde_json::from_value(json).unwrap();
        assert_eq!(resp.collection.len(), 2);

        let first = &resp.collection[0];
        assert!(first.items.is_some());
        let items = first.items.as_ref().unwrap();
        assert_eq!(items.collection.len(), 1);
        assert_eq!(items.collection[0].title.as_deref(), Some("Daily Mix 1"));

        let second = &resp.collection[1];
        assert!(second.items.is_none());
    }
}
