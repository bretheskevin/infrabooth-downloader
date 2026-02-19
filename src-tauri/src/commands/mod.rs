pub mod auth;
pub mod download;
pub mod ffmpeg;
pub mod playlist;
pub mod settings;
pub mod updater;
pub mod ytdlp;

pub use auth::{check_auth_state, complete_oauth, sign_out, start_oauth, OAuthState};
pub use download::{
    cancel_download_queue, download_track_full, respond_to_auth_choice, start_download_queue,
};
pub use ffmpeg::test_ffmpeg;
pub use playlist::{get_playlist_info, get_track_info, validate_soundcloud_url};
pub use settings::{check_write_permission, get_default_download_path, validate_download_path};
pub use updater::{check_for_updates, install_update};
pub use ytdlp::test_ytdlp;
