use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path as AxumPath, Query, State as AxumState,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use rust_embed::Embed;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{broadcast, oneshot, watch, Mutex};

use crate::services::{client_id, events, search};

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
    pub state_tx: broadcast::Sender<String>,
    pub last_state: watch::Sender<Option<String>>,
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
}

#[derive(Deserialize)]
struct TokenQuery {
    #[serde(alias = "t")]
    token: String,
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
    #[serde(alias = "t")]
    token: String,
}

fn serve_asset(path: &str) -> Response {
    match RemoteAssets::get(path) {
        Some(file) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            (StatusCode::OK, [(axum::http::header::CONTENT_TYPE, mime.as_ref().to_owned())], file.data.into_owned()).into_response()
        }
        None => match RemoteAssets::get("index.html") {
            Some(index) => {
                let mime = mime_guess::from_path("index.html").first_or_octet_stream();
                (StatusCode::OK, [(axum::http::header::CONTENT_TYPE, mime.as_ref().to_owned())], index.data.into_owned()).into_response()
            }
            None => StatusCode::NOT_FOUND.into_response(),
        },
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
    if !token_matches(&params.token, &state.token) {
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

    loop {
        tokio::select! {
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

async fn search_handler(AxumState(state): AxumState<AppState>, Query(params): Query<SearchQuery>) -> impl IntoResponse {
    if !token_matches(&params.token, &state.token) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }

    let cid = match client_id::get_client_id().await {
        Ok(id) => id,
        Err(e) => {
            log::error!("[remote] search client_id: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response();
        }
    };

    match search::search_tracks(&cid, &params.q, 20, 0).await {
        Ok(response) => Json(response.collection).into_response(),
        Err(e) => {
            log::error!("[remote] search: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn start_server(app_handle: AppHandle) -> Result<RemoteServerInfo, String> {
    let token = generate_token();
    let (state_tx, _) = broadcast::channel(64);
    let (last_state_tx, last_state_rx) = watch::channel(None);
    let (shutdown_tx, shutdown_rx) = oneshot::channel();

    let app_state = AppState { token: token.clone(), app_handle: app_handle.clone(), state_tx: state_tx.clone(), last_state: last_state_rx };

    let router = Router::new()
        .route("/", get(root_handler))
        .route("/ws", get(ws_handler))
        .route("/api/search", get(search_handler))
        .route("/{*path}", get(static_handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:0").await.map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let lan_ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    let url = format!("http://{}:{}/?t={}", lan_ip, port, token);

    let server = axum::serve(listener, router).with_graceful_shutdown(async move {
        let _ = shutdown_rx.await;
    });

    tokio::spawn(async move {
        if let Err(e) = server.await {
            log::error!("[remote] server error: {}", e);
        }
    });

    let server_state = app_handle.state::<RemoteServerState>();
    let mut guard = server_state.inner.lock().await;
    *guard = Some(RunningServer { shutdown_tx, port, state_tx, last_state: last_state_tx });

    log::info!("[remote] server started on port {}", port);

    Ok(RemoteServerInfo { url, port, token })
}

pub async fn stop_server(app_handle: &AppHandle) {
    let server_state = app_handle.state::<RemoteServerState>();
    let mut guard = server_state.inner.lock().await;
    if let Some(server) = guard.take() {
        let _ = server.shutdown_tx.send(());
        log::info!("[remote] server stopped on port {}", server.port);
    }
}

pub async fn broadcast_state(app_handle: &AppHandle, state_json: String) {
    let server_state = app_handle.state::<RemoteServerState>();
    let guard = server_state.inner.lock().await;
    if let Some(server) = guard.as_ref() {
        let _ = server.last_state.send(Some(state_json.clone()));
        let _ = server.state_tx.send(state_json);
    }
}

fn generate_token() -> String {
    use rand::Rng;
    let mut bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}
