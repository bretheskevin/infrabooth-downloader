pub mod auth;
pub mod download;
pub mod ffmpeg;
pub mod playlist;
pub mod settings;
pub mod ytdlp;

pub use auth::{check_auth_state, complete_oauth, sign_out, start_oauth, OAuthState};
pub use download::{download_track_full, start_download_queue};
pub use ffmpeg::test_ffmpeg;
pub use playlist::{get_playlist_info, get_track_info, validate_soundcloud_url};
pub use settings::{check_write_permission, get_default_download_path};
pub use ytdlp::test_ytdlp;
