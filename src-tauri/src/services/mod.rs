pub mod auth_choice;
pub mod cancellation;
pub mod constants;
pub mod deep_link;
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
pub mod url_validator;
pub mod updater;
pub mod ytdlp;
pub mod ytdlp_errors;

pub const AUTH_CALLBACK_EVENT: &str = "auth-callback";
