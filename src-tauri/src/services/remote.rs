use std::future::Future;

use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path as AxumPath, Query, State as AxumState,
    },
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rust_embed::Embed;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{broadcast, mpsc, oneshot, watch, Mutex};

use crate::models::error::ResolveLinkError;
use crate::services::playlist_tracks_cache::PlaylistTracksCache;
use crate::services::resolve_link::{self, ResolvedLink};
use crate::services::{client_id, events, library, playlist, search, selections};

#[derive(Embed)]
#[folder = "remote-dist/"]
struct RemoteAssets;

#[derive(Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoteServerInfo {
    pub url: String,
    pub port: u16,
    pub token: String,
}

pub struct RunningServer {
    pub shutdown_tx: oneshot::Sender<()>,
    pub port: u16,
}

pub struct RemoteHub {
    state_tx: broadcast::Sender<String>,
    last_state: watch::Sender<Option<String>>,
}

impl Default for RemoteHub {
    fn default() -> Self {
        let (state_tx, _) = broadcast::channel(64);
        let (last_state, _) = watch::channel(None);
        Self { state_tx, last_state }
    }
}

impl RemoteHub {
    pub fn publish(&self, state_json: String) {
        self.last_state.send_replace(Some(state_json.clone()));
        let _ = self.state_tx.send(state_json);
    }
}

#[derive(Default)]
pub struct RemoteServerState {
    pub inner: Mutex<Option<RunningServer>>,
}

#[derive(Clone)]
struct AppState {
    token: String,
    app_handle: AppHandle,
    state_tx: broadcast::Sender<String>,
    last_state: watch::Receiver<Option<String>>,
    closed: watch::Receiver<()>,
}

impl AppState {
    fn authorize(&self, provided: &str) -> bool {
        token_matches(provided, &self.token)
    }
}

struct ListenerConfig {
    bind_addr: &'static str,
    token: String,
}

#[derive(Deserialize)]
struct TokenQuery {
    #[serde(alias = "t")]
    token: String,
}

#[derive(Deserialize)]
struct StreamableQuery {
    #[serde(alias = "t")]
    token: String,
    #[serde(default)]
    stream: bool,
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
    #[serde(alias = "t")]
    token: String,
}

#[derive(Deserialize)]
struct ResourceQuery {
    id: u64,
    secret: Option<String>,
    #[serde(alias = "t")]
    token: String,
}

#[derive(Deserialize)]
struct PlaylistTracksQuery {
    id: u64,
    secret: Option<String>,
    #[serde(alias = "t")]
    token: String,
    #[serde(default)]
    stream: bool,
}

#[derive(Deserialize)]
struct LinkQuery {
    url: String,
    #[serde(alias = "t")]
    token: String,
}

fn serve_asset(path: &str) -> Response {
    let path = if path.is_empty() { "index.html" } else { path };

    if path == "index.html" {
        return serve_index();
    }

    if let Some(file) = RemoteAssets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return (StatusCode::OK, [(axum::http::header::CONTENT_TYPE, mime.as_ref().to_owned())], file.data.into_owned()).into_response();
    }

    if path.contains('.') {
        return StatusCode::NOT_FOUND.into_response();
    }

    serve_index()
}

fn serve_index() -> Response {
    match RemoteAssets::get("index.html") {
        Some(index) => (
            StatusCode::OK,
            [(axum::http::header::CONTENT_TYPE, "text/html".to_owned()), (axum::http::header::CACHE_CONTROL, "no-cache".to_owned())],
            index.data.into_owned(),
        )
            .into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

async fn root_handler() -> impl IntoResponse {
    serve_asset("index.html")
}

async fn static_handler(AxumPath(path): AxumPath<String>) -> impl IntoResponse {
    serve_asset(&path)
}

fn token_matches(provided: &str, expected: &str) -> bool {
    let provided = provided.as_bytes();
    let expected = expected.as_bytes();
    if provided.len() != expected.len() {
        return false;
    }
    provided.iter().zip(expected.iter()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0
}

async fn ws_handler(ws: WebSocketUpgrade, Query(params): Query<TokenQuery>, AxumState(state): AxumState<AppState>) -> impl IntoResponse {
    if !state.authorize(&params.token) {
        return StatusCode::UNAUTHORIZED.into_response();
    }
    ws.on_upgrade(move |socket| handle_ws(socket, state))
}

async fn handle_ws(mut socket: WebSocket, state: AppState) {
    let initial_state = state.last_state.borrow().clone();
    if let Some(current) = initial_state {
        let _ = socket.send(Message::Text(current.into())).await;
    }

    let mut broadcast_rx = state.state_tx.subscribe();
    let mut closed = state.closed.clone();

    loop {
        tokio::select! {
            _ = closed.changed() => {
                log::info!("[remote] listener stopped, closing websocket");
                break;
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        let _ = state.app_handle.emit(events::REMOTE_COMMAND, text.to_string());
                    }
                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                    _ => {}
                }
            }
            result = broadcast_rx.recv() => {
                match result {
                    Ok(state_json) => {
                        if socket.send(Message::Text(state_json.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => {}
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        }
    }
}

#[expect(clippy::result_large_err, reason = "axum early-return response; built at most once per request")]
async fn authorized_client_id(state: &AppState, token: &str, tag: &str) -> Result<String, Response> {
    if !state.authorize(token) {
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized").into_response());
    }
    client_id::get_client_id().await.map_err(|e| {
        log::error!("[remote] {tag} client_id: {e}");
        (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
    })
}

async fn search_handler(AxumState(state): AxumState<AppState>, Query(params): Query<SearchQuery>) -> impl IntoResponse {
    let cid = match authorized_client_id(&state, &params.token, "search").await {
        Ok(id) => id,
        Err(r) => return r,
    };

    match search::search_tracks(&cid, &params.q, 20, 0).await {
        Ok(response) => Json(response.collection).into_response(),
        Err(e) => {
            log::error!("[remote] search: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

fn artist_playlist_to_library(p: crate::models::artist::ArtistPlaylist) -> library::LibraryPlaylist {
    library::LibraryPlaylist {
        id: p.id,
        title: p.title,
        username: p.user.as_ref().map(|u| u.username.clone()).unwrap_or_default(),
        user_id: p.user.as_ref().map(|u| u.id),
        artwork_url: p.artwork_url,
        track_count: p.track_count,
        duration: p.duration.unwrap_or(0),
        permalink_url: p.permalink_url,
        is_owned: false,
        is_public: p.is_public,
        secret_token: p.secret_token,
    }
}

async fn search_playlists_handler(AxumState(state): AxumState<AppState>, Query(params): Query<SearchQuery>) -> impl IntoResponse {
    let cid = match authorized_client_id(&state, &params.token, "search-playlists").await {
        Ok(id) => id,
        Err(r) => return r,
    };
    match search::search_playlists(&cid, &params.q, 20, 0).await {
        Ok(response) => {
            let playlists: Vec<library::LibraryPlaylist> = response.collection.into_iter().map(artist_playlist_to_library).collect();
            Json(playlists).into_response()
        }
        Err(e) => {
            log::error!("[remote] search-playlists: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

async fn search_albums_handler(AxumState(state): AxumState<AppState>, Query(params): Query<SearchQuery>) -> impl IntoResponse {
    let cid = match authorized_client_id(&state, &params.token, "search-albums").await {
        Ok(id) => id,
        Err(r) => return r,
    };
    match search::search_albums(&cid, &params.q, 20, 0).await {
        Ok(response) => {
            let playlists: Vec<library::LibraryPlaylist> = response.collection.into_iter().map(artist_playlist_to_library).collect();
            Json(playlists).into_response()
        }
        Err(e) => {
            log::error!("[remote] search-albums: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

#[derive(Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum StreamEvent<'a, T: Serialize> {
    Batch { items: &'a [T] },
    Done { items: &'a [T] },
    Error { message: &'a str },
}

type BatchSink<T> = Box<dyn Fn(&[T]) + Send + Sync>;

fn send_line<T: Serialize>(tx: &mpsc::UnboundedSender<String>, tag: &str, event: &StreamEvent<'_, T>) {
    let mut line = match serde_json::to_string(event) {
        Ok(line) => line,
        Err(e) => {
            log::error!("[remote] {} stream: failed to serialize event: {}", tag, e);
            return;
        }
    };
    line.push('\n');
    if tx.send(line).is_err() {
        log::debug!("[remote] {} stream: client disconnected, dropping event", tag);
    }
}

/// NDJSON: one `batch` line per page as it arrives, then `done` with the full ordered list (or `error`).
fn stream_ndjson<T, F, Fut>(tag: &'static str, fetch: F) -> Response
where
    T: Serialize + Send + 'static,
    F: FnOnce(BatchSink<T>) -> Fut,
    Fut: Future<Output = Result<Vec<T>, String>> + Send + 'static,
{
    let (tx, rx) = mpsc::unbounded_channel::<String>();
    let batch_tx = tx.clone();
    let on_batch: BatchSink<T> = Box::new(move |items: &[T]| {
        log::debug!("[remote] {} stream: sending batch of {}", tag, items.len());
        send_line(&batch_tx, tag, &StreamEvent::Batch { items });
    });
    let fetch_future = fetch(on_batch);

    tokio::spawn(async move {
        match fetch_future.await {
            Ok(items) => {
                log::info!("[remote] {} stream: done with {} items", tag, items.len());
                send_line(&tx, tag, &StreamEvent::Done { items: &items });
            }
            Err(e) => {
                log::error!("[remote] {} stream: {}", tag, e);
                send_line::<T>(&tx, tag, &StreamEvent::Error { message: &e });
            }
        }
    });

    let lines = futures::stream::unfold(rx, |mut rx| async move { rx.recv().await.map(|line| (Ok::<_, std::convert::Infallible>(line), rx)) });
    ([(header::CONTENT_TYPE, "application/x-ndjson")], Body::from_stream(lines)).into_response()
}

async fn load_library<F>(app_handle: &AppHandle, on_batch: F) -> Result<Vec<library::LibraryPlaylist>, String>
where
    F: Fn(&[library::LibraryPlaylist]),
{
    let (oauth_token, cid) = crate::commands::require_auth_and_cid(app_handle).await?;

    let cache = app_handle.state::<library::LibraryCache>();
    if let Some(playlists) = cache.get_if_complete_enriched() {
        log::info!("[remote] library: returning {} cached playlists", playlists.len());
        return Ok(playlists);
    }

    log::info!("[remote] library: cache miss, fetching from API");
    let enriched_batch = |batch: &[library::LibraryPlaylist]| on_batch(&cache.enrich(batch.to_vec()));
    let playlists = library::fetch_all_library_pages(&oauth_token, &cid, enriched_batch).await.map_err(|e| e.to_string())?;
    Ok(cache.set_and_enrich(playlists))
}

#[expect(clippy::result_large_err, reason = "axum early-return response; built at most once per request")]
fn authorize_signed_in(state: &AppState, token: &str, tag: &str) -> Result<(), Response> {
    if !state.authorize(token) {
        return Err((StatusCode::UNAUTHORIZED, "Unauthorized").into_response());
    }
    if state.app_handle.state::<crate::services::storage::AuthState>().get_token().is_none() {
        log::info!("[remote] {tag}: signed out, responding 403");
        return Err((StatusCode::FORBIDDEN, "Signed out").into_response());
    }
    Ok(())
}

async fn library_handler(AxumState(state): AxumState<AppState>, Query(params): Query<StreamableQuery>) -> impl IntoResponse {
    if let Err(response) = authorize_signed_in(&state, &params.token, "library") {
        return response;
    }

    let app_handle = state.app_handle.clone();
    if params.stream {
        return stream_ndjson("library", move |on_batch| async move { load_library(&app_handle, on_batch).await });
    }

    match load_library(&app_handle, |_| {}).await {
        Ok(playlists) => Json(playlists).into_response(),
        Err(e) => {
            log::error!("[remote] library: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}

async fn liked_tracks_handler(AxumState(state): AxumState<AppState>, Query(params): Query<StreamableQuery>) -> impl IntoResponse {
    if let Err(response) = authorize_signed_in(&state, &params.token, "liked-tracks") {
        return response;
    }

    let app_handle = state.app_handle.clone();
    if params.stream {
        return stream_ndjson("liked-tracks", move |on_batch| async move {
            let user_id = crate::commands::require_user_id(&app_handle)?;
            crate::commands::library::load_liked_tracks(&app_handle, user_id, on_batch).await
        });
    }

    match crate::commands::get_liked_tracks(app_handle).await {
        Ok(tracks) => Json(tracks).into_response(),
        Err(e) => {
            log::error!("[remote] liked-tracks: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}

async fn load_playlist_tracks<F>(
    app_handle: &AppHandle, id: u64, secret: Option<String>, on_batch: F,
) -> Result<Vec<crate::services::playlist::TrackInfo>, String>
where
    F: Fn(&[crate::services::playlist::TrackInfo]),
{
    let cache = app_handle.state::<PlaylistTracksCache>();
    if let Some(tracks) = cache.get(id) {
        log::info!("[remote] playlist-tracks: id={} returning {} cached tracks", id, tracks.len());
        return Ok(tracks);
    }

    let fetch_lock = cache.fetch_lock(id);
    let _guard = fetch_lock.lock().await;
    if let Some(tracks) = cache.get(id) {
        log::info!("[remote] playlist-tracks: id={} served by concurrent fetch ({} tracks)", id, tracks.len());
        return Ok(tracks);
    }

    let result = fetch_playlist_tracks_uncached(app_handle, id, secret, on_batch).await;
    if let Ok(tracks) = &result {
        cache.set(id, tracks.clone());
    }
    cache.release_fetch_lock(id);
    result
}

async fn fetch_playlist_tracks_uncached<F>(
    app_handle: &AppHandle, id: u64, secret: Option<String>, on_batch: F,
) -> Result<Vec<crate::services::playlist::TrackInfo>, String>
where
    F: Fn(&[crate::services::playlist::TrackInfo]),
{
    let (oauth_token, _cid) = crate::commands::get_optional_auth_and_cid(app_handle).await?;
    let resolved_secret = secret.or_else(|| app_handle.state::<library::LibraryCache>().get_secret_token(id));
    log::info!("[remote] playlist-tracks: id={} has_secret={} authenticated={}", id, resolved_secret.is_some(), oauth_token.is_some());
    playlist::fetch_playlist_by_id(id, resolved_secret.as_deref(), oauth_token.as_deref(), on_batch).await.map_err(|e| e.to_string())
}

async fn playlist_tracks_handler(AxumState(state): AxumState<AppState>, Query(params): Query<PlaylistTracksQuery>) -> impl IntoResponse {
    if !state.authorize(&params.token) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }

    let app_handle = state.app_handle.clone();
    let (id, secret) = (params.id, params.secret);
    if params.stream {
        return stream_ndjson("playlist-tracks", move |on_batch| async move { load_playlist_tracks(&app_handle, id, secret, on_batch).await });
    }

    match load_playlist_tracks(&app_handle, id, secret, |_| {}).await {
        Ok(tracks) => Json(tracks).into_response(),
        Err(e) => {
            log::error!("[remote] playlist-tracks: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}

const MAX_CONCURRENT_ARTWORK_RESOLUTIONS: usize = 8;
const ARTWORK_RETRY_DELAY: std::time::Duration = std::time::Duration::from_millis(500);

static ARTWORK_RESOLUTION_LIMIT: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(MAX_CONCURRENT_ARTWORK_RESOLUTIONS);

async fn resolve_artwork_throttled(app_handle: &AppHandle, id: u64, secret: Option<String>) -> Result<Option<String>, String> {
    if let Some(cached) = app_handle.state::<library::LibraryCache>().get_artwork(id) {
        return Ok(cached);
    }
    let _permit = ARTWORK_RESOLUTION_LIMIT.acquire().await.map_err(|e| e.to_string())?;
    match crate::commands::resolve_library_artwork(id, secret.clone(), app_handle.clone()).await {
        Ok(artwork) => Ok(artwork),
        Err(e) => {
            log::warn!("[remote] library-artwork: playlist {} failed, retrying once: {}", id, e);
            tokio::time::sleep(ARTWORK_RETRY_DELAY).await;
            crate::commands::resolve_library_artwork(id, secret, app_handle.clone()).await
        }
    }
}

#[derive(Serialize)]
struct PlaylistArtwork {
    id: u64,
    url: Option<String>,
}

async fn load_missing_artworks<F>(app_handle: &AppHandle, on_batch: F) -> Result<Vec<PlaylistArtwork>, String>
where
    F: Fn(&[PlaylistArtwork]),
{
    use futures::stream::{self, StreamExt};

    let playlists = load_library(app_handle, |_| {}).await?;
    let missing: Vec<(u64, Option<String>)> = playlists.into_iter().filter(|p| p.artwork_url.is_none()).map(|p| (p.id, p.secret_token)).collect();
    log::info!("[remote] library-artworks: resolving {} missing artworks", missing.len());

    let mut pending = stream::iter(missing)
        .map(|(id, secret)| async move { (id, resolve_artwork_throttled(app_handle, id, secret).await) })
        .buffer_unordered(MAX_CONCURRENT_ARTWORK_RESOLUTIONS);

    let mut resolved = Vec::new();
    while let Some((id, result)) = pending.next().await {
        match result {
            Ok(url) => {
                let artwork = PlaylistArtwork { id, url };
                on_batch(std::slice::from_ref(&artwork));
                resolved.push(artwork);
            }
            Err(e) => log::error!("[remote] library-artworks: playlist {}: {}", id, e),
        }
    }
    Ok(resolved)
}

async fn library_artworks_handler(AxumState(state): AxumState<AppState>, Query(params): Query<TokenQuery>) -> impl IntoResponse {
    if let Err(response) = authorize_signed_in(&state, &params.token, "library-artworks") {
        return response;
    }

    let app_handle = state.app_handle.clone();
    stream_ndjson("library-artworks", move |on_batch| async move { load_missing_artworks(&app_handle, on_batch).await })
}

async fn library_artwork_handler(AxumState(state): AxumState<AppState>, Query(params): Query<ResourceQuery>) -> impl IntoResponse {
    if !state.authorize(&params.token) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }

    match resolve_artwork_throttled(&state.app_handle, params.id, params.secret).await {
        Ok(artwork) => Json(artwork).into_response(),
        Err(e) => {
            log::error!("[remote] library-artwork: playlist {}: {}", params.id, e);
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}

async fn selections_handler(AxumState(state): AxumState<AppState>, Query(params): Query<TokenQuery>) -> impl IntoResponse {
    if let Err(response) = authorize_signed_in(&state, &params.token, "selections") {
        return response;
    }

    let cache = state.app_handle.state::<selections::SelectionCache>();
    if let Some(cached) = cache.get() {
        return Json(cached).into_response();
    }

    let (oauth_token, cid) = match crate::commands::require_auth_and_cid(&state.app_handle).await {
        Ok(pair) => pair,
        Err(e) => {
            log::error!("[remote] selections auth: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response();
        }
    };

    match selections::fetch_selections(&oauth_token, &cid).await {
        Ok(sels) => {
            cache.set(sels.clone());
            Json(sels).into_response()
        }
        Err(e) => {
            log::error!("[remote] selections fetch: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}

fn state_response(authorized: bool, latest: Option<String>) -> Response {
    if !authorized {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }
    match latest {
        Some(json) => (StatusCode::OK, [(header::CONTENT_TYPE, "application/json")], json).into_response(),
        None => (StatusCode::SERVICE_UNAVAILABLE, "No state pushed yet").into_response(),
    }
}

async fn state_handler(AxumState(state): AxumState<AppState>, Query(params): Query<TokenQuery>) -> Response {
    let authorized = state.authorize(&params.token);
    let latest = state.last_state.borrow().clone();
    state_response(authorized, latest)
}

fn relay_command(authorized: bool, body: String, emit: impl FnOnce(String)) -> StatusCode {
    if !authorized {
        return StatusCode::UNAUTHORIZED;
    }
    let command_type = match serde_json::from_str::<serde_json::Value>(&body) {
        Ok(value) => value.get("type").and_then(|t| t.as_str()).unwrap_or("<missing>").to_owned(),
        Err(e) => {
            log::warn!("[remote] /api/command rejected non-JSON body: {e}");
            return StatusCode::BAD_REQUEST;
        }
    };
    log::info!("[remote] /api/command type={command_type}");
    emit(body);
    StatusCode::ACCEPTED
}

async fn command_handler(AxumState(state): AxumState<AppState>, Query(params): Query<TokenQuery>, body: String) -> Response {
    let authorized = state.authorize(&params.token);
    let app_handle = state.app_handle.clone();
    relay_command(authorized, body, |command| {
        if let Err(e) = app_handle.emit(events::REMOTE_COMMAND, command) {
            log::error!("[remote] /api/command emit failed: {e}");
        }
    })
    .into_response()
}

fn resolve_link_response(result: Result<ResolvedLink, ResolveLinkError>) -> Response {
    match result {
        Ok(link) => Json(link).into_response(),
        Err(ResolveLinkError::Invalid(message)) => (StatusCode::BAD_REQUEST, message).into_response(),
        Err(ResolveLinkError::Fetch(message)) => (StatusCode::BAD_GATEWAY, message).into_response(),
    }
}

fn log_resolve_result(url: &str, result: &Result<ResolvedLink, ResolveLinkError>) {
    match result {
        Ok(ResolvedLink::Track { track }) => log::info!("[remote] resolve-link: {url} -> track {} '{}'", track.id, track.title),
        Ok(ResolvedLink::Playlist { playlist }) => log::info!(
            "[remote] resolve-link: {url} -> playlist {} '{}' ({} of {} tracks resolved)",
            playlist.id,
            playlist.title,
            playlist.tracks.len(),
            playlist.track_count
        ),
        Err(e) => log::warn!("[remote] resolve-link: {url} failed: {e:?}"),
    }
}

async fn resolve_link_handler(AxumState(state): AxumState<AppState>, Query(params): Query<LinkQuery>) -> Response {
    if !state.authorize(&params.token) {
        log::warn!("[remote] resolve-link: unauthorized");
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }
    log::info!("[remote] resolve-link: url={}", params.url);
    let oauth_token = state.app_handle.state::<crate::services::storage::AuthState>().get_token();
    let result = resolve_link::resolve_link(&params.url, oauth_token.as_deref()).await;
    log_resolve_result(&params.url, &result);
    resolve_link_response(result)
}

fn build_router(app_state: AppState) -> Router {
    Router::new()
        .route("/", get(root_handler))
        .route("/ws", get(ws_handler))
        .route("/api/search", get(search_handler))
        .route("/api/search-playlists", get(search_playlists_handler))
        .route("/api/search-albums", get(search_albums_handler))
        .route("/api/library", get(library_handler))
        .route("/api/liked-tracks", get(liked_tracks_handler))
        .route("/api/playlist-tracks", get(playlist_tracks_handler))
        .route("/api/library-artwork", get(library_artwork_handler))
        .route("/api/library-artworks", get(library_artworks_handler))
        .route("/api/selections", get(selections_handler))
        .route("/api/resolve-link", get(resolve_link_handler))
        .route("/api/state", get(state_handler))
        .route("/api/command", post(command_handler))
        .route("/{*path}", get(static_handler))
        .with_state(app_state)
}

async fn serve<F>(app_handle: &AppHandle, config: ListenerConfig, shutdown: F) -> Result<u16, String>
where
    F: Future<Output = ()> + Send + 'static,
{
    let ListenerConfig { bind_addr, token } = config;
    let hub = app_handle.state::<RemoteHub>();
    let (closed_tx, closed_rx) = watch::channel(());
    let app_state =
        AppState { token, app_handle: app_handle.clone(), state_tx: hub.state_tx.clone(), last_state: hub.last_state.subscribe(), closed: closed_rx };

    let listener = tokio::net::TcpListener::bind(bind_addr).await.map_err(|e| {
        log::error!("[remote] bind {bind_addr} failed: kind={:?} os_error={:?} {e}", e.kind(), e.raw_os_error());
        e.to_string()
    })?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    // Upgraded websockets outlive axum's graceful shutdown, so they watch `closed` to drop with their listener.
    let server = axum::serve(listener, build_router(app_state)).with_graceful_shutdown(async move {
        shutdown.await;
        drop(closed_tx);
    });
    tokio::spawn(async move {
        if let Err(e) = server.await {
            log::error!("[remote] server error on {bind_addr}: {e}");
        }
    });

    log::info!("[remote] listener bound on {bind_addr} (port {port})");
    Ok(port)
}

pub async fn start_server(app_handle: AppHandle) -> Result<RemoteServerInfo, String> {
    let token = generate_token();
    let lan_ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    let (shutdown_tx, shutdown_rx) = oneshot::channel();

    let config = ListenerConfig { bind_addr: "0.0.0.0:0", token: token.clone() };
    let port = serve(&app_handle, config, async move {
        let _ = shutdown_rx.await;
    })
    .await?;

    let url = format!("http://{}:{}/?t={}", lan_ip, port, token);

    let server_state = app_handle.state::<RemoteServerState>();
    let mut guard = server_state.inner.lock().await;
    *guard = Some(RunningServer { shutdown_tx, port });

    log::info!("[remote] server started on port {}", port);

    Ok(RemoteServerInfo { url, port, token })
}

pub async fn start_local_api(app_handle: &AppHandle, token: String) -> Result<u16, String> {
    let config = ListenerConfig { bind_addr: "127.0.0.1:0", token };
    serve(app_handle, config, std::future::pending()).await
}

pub async fn stop_server(app_handle: &AppHandle) {
    let server_state = app_handle.state::<RemoteServerState>();
    let mut guard = server_state.inner.lock().await;
    if let Some(server) = guard.take() {
        let _ = server.shutdown_tx.send(());
        log::info!("[remote] server stopped on port {}", server.port);
    }
}

pub fn broadcast_state(app_handle: &AppHandle, state_json: String) {
    app_handle.state::<RemoteHub>().publish(state_json);
}

pub(crate) fn generate_token() -> String {
    use rand::Rng;
    let mut bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::header::CONTENT_TYPE;

    type TestResult<T = ()> = Result<T, Box<dyn std::error::Error>>;

    async fn body_string(response: Response) -> TestResult<String> {
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await?;
        Ok(String::from_utf8(bytes.to_vec())?)
    }

    #[test]
    fn hub_publish_stores_state_without_any_listener() {
        let hub = RemoteHub::default();
        hub.publish("a".to_string());
        hub.publish("b".to_string());
        assert_eq!(*hub.last_state.borrow(), Some("b".to_string()));
    }

    #[test]
    fn hub_late_subscriber_sees_latest_state() {
        let hub = RemoteHub::default();
        hub.publish("a".to_string());
        let rx = hub.last_state.subscribe();
        assert_eq!(*rx.borrow(), Some("a".to_string()));
    }

    #[test]
    fn token_matches_requires_exact_token() {
        assert!(token_matches("abc", "abc"));
        assert!(!token_matches("ab", "abc"));
        assert!(!token_matches("abd", "abc"));
    }

    #[test]
    fn state_response_rejects_unauthorized() {
        let response = state_response(false, Some("{}".to_string()));
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn state_response_is_unavailable_before_first_push() {
        let response = state_response(true, None);
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test]
    async fn state_response_returns_raw_json() -> TestResult {
        let json = r#"{"state":"playing","currentTrack":null}"#.to_string();
        let response = state_response(true, Some(json.clone()));
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers().get(CONTENT_TYPE).map(|value| value.as_bytes()), Some(b"application/json".as_slice()));
        assert_eq!(body_string(response).await?, json);
        Ok(())
    }

    #[tokio::test]
    async fn stream_ndjson_emits_batches_then_done() -> TestResult {
        let response = stream_ndjson("test", |on_batch| async move {
            on_batch(&[1, 2]);
            on_batch(&[3]);
            Ok(vec![3, 1, 2])
        });
        assert_eq!(response.headers().get(CONTENT_TYPE).map(|value| value.as_bytes()), Some(b"application/x-ndjson".as_slice()));
        assert_eq!(
            body_string(response).await?,
            "{\"type\":\"batch\",\"items\":[1,2]}\n{\"type\":\"batch\",\"items\":[3]}\n{\"type\":\"done\",\"items\":[3,1,2]}\n"
        );
        Ok(())
    }

    #[tokio::test]
    async fn stream_ndjson_emits_error_line_on_failure() -> TestResult {
        let response = stream_ndjson::<u32, _, _>("test", |_| async move { Err("boom".to_string()) });
        assert_eq!(body_string(response).await?, "{\"type\":\"error\",\"message\":\"boom\"}\n");
        Ok(())
    }

    #[test]
    fn relay_command_rejects_unauthorized_without_emitting() {
        let mut emitted = Vec::new();
        let status = relay_command(false, r#"{"type":"pause"}"#.to_string(), |c| emitted.push(c));
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert!(emitted.is_empty());
    }

    #[test]
    fn relay_command_rejects_non_json_body() {
        let mut emitted = Vec::new();
        let status = relay_command(true, "not json".to_string(), |c| emitted.push(c));
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(emitted.is_empty());
    }

    #[test]
    fn relay_command_emits_body_unchanged() {
        let body = r#"{"type":"queueTrack","track":{"trackId":1}}"#.to_string();
        let mut emitted = Vec::new();
        let status = relay_command(true, body.clone(), |c| emitted.push(c));
        assert_eq!(status, StatusCode::ACCEPTED);
        assert_eq!(emitted, vec![body]);
    }

    #[tokio::test]
    async fn resolve_link_response_maps_invalid_links_to_bad_request() -> TestResult {
        let response = resolve_link_response(Err(ResolveLinkError::Invalid("Not a SoundCloud URL".to_string())));
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(body_string(response).await?, "Not a SoundCloud URL");
        Ok(())
    }

    #[tokio::test]
    async fn resolve_link_response_maps_fetch_failures_to_bad_gateway() -> TestResult {
        let response = resolve_link_response(Err(ResolveLinkError::Fetch("Not found".to_string())));
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
        assert_eq!(body_string(response).await?, "Not found");
        Ok(())
    }

    #[tokio::test]
    async fn resolve_link_response_returns_tagged_json() -> TestResult {
        let response = resolve_link_response(Ok(ResolvedLink::Track { track: crate::services::playlist::test_track_info() }));
        assert_eq!(response.status(), StatusCode::OK);
        let json: serde_json::Value = serde_json::from_str(&body_string(response).await?)?;
        assert_eq!(json["kind"], "track");
        Ok(())
    }
}
