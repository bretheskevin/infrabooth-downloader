use tauri::State;

use crate::models::error::ErrorResponse;
use crate::models::player::*;
use crate::services::player::{PlayerCommandSender, SharedPlayerState};

/// Send a command to the audio thread without acquiring the state mutex.
fn send(tx: &PlayerCommandSender, cmd: PlayerCommand) -> Result<(), ErrorResponse> {
    tx.send(cmd).map_err(|_| PlayerError::AudioThreadUnavailable)?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn player_play_at(
    queue: Vec<PlaybackItem>,
    index: usize,
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Play { queue, index })
}

#[tauri::command]
#[specta::specta]
pub async fn player_pause(
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Pause)
}

#[tauri::command]
#[specta::specta]
pub async fn player_resume(
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Resume)
}

#[tauri::command]
#[specta::specta]
pub async fn player_seek(
    position_ms: u64,
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Seek { position_ms })
}

#[tauri::command]
#[specta::specta]
pub async fn player_set_volume(
    volume: f32,
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::SetVolume { volume })
}

#[tauri::command]
#[specta::specta]
pub async fn player_next(
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Next)
}

#[tauri::command]
#[specta::specta]
pub async fn player_previous(
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Previous)
}

#[tauri::command]
#[specta::specta]
pub async fn player_stop(
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Stop)
}

#[tauri::command]
#[specta::specta]
pub async fn player_get_state(
    state: State<'_, SharedPlayerState>,
) -> Result<PlayerStateSnapshot, ErrorResponse> {
    let player = state.lock().await;
    Ok(player.get_snapshot())
}

#[tauri::command]
#[specta::specta]
pub async fn player_reorder_queue(
    from_index: usize,
    to_index: usize,
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(
        &tx,
        PlayerCommand::Reorder {
            from_index,
            to_index,
        },
    )
}

#[tauri::command]
#[specta::specta]
pub async fn player_remove_from_queue(
    index: usize,
    tx: State<'_, PlayerCommandSender>,
) -> Result<(), ErrorResponse> {
    send(&tx, PlayerCommand::Remove { index })
}
