pub mod auth_choice;
pub mod cancellation;
pub mod cookie;
pub mod client_id;
pub mod constants;
pub mod deep_link;
pub mod downloader;
#[cfg(debug_assertions)]
pub mod dev_server;
pub mod ffmpeg;
pub mod http;
pub mod metadata;
pub mod oauth;
pub mod paths;
pub mod pipeline;
pub mod playlist;
pub mod queue;
pub mod sidecar;
pub mod storage;
pub mod stream;
pub mod url_validator;
pub mod updater;

pub const AUTH_CALLBACK_EVENT: &str = "auth-callback";
