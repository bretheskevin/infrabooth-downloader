use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use tauri::{Emitter, Manager, State};
use tokio::sync::{Mutex, Semaphore};
use tokio::task::JoinSet;

use crate::models::error::{DownloadError, ErrorResponse, RekordboxError};
use crate::models::track::TrackCore;
use crate::services::cancellation::{ActiveProcess, CancellationState};
use crate::services::events::REKORDBOX_EXPORT_PROGRESS;
use crate::services::metadata::{scan_existing_track_ids, TrackMetadata};
use crate::services::pipeline::{download_and_convert, CancellationHandles, PipelineConfig};
use crate::services::rekordbox::models::{ExportResult, ExportTrackRequest, RekordboxExportProgressEvent, RekordboxExportStatus, ALL_TRACKS_PLAYLIST_NAME};
use crate::services::rekordbox::{file_manager, playlist};
use crate::services::storage::AuthState;

use super::rekordbox::{export_single_track, is_content_in_playlist, RekordboxWriteContext};

const EXPORT_DOWNLOADS_DIR: &str = ".rekordbox-downloads";

#[derive(Default)]
pub struct RekordboxExportCancellation(CancellationState);

impl Deref for RekordboxExportCancellation {
    type Target = CancellationState;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

fn emit_progress(app: &tauri::AppHandle, event: RekordboxExportProgressEvent) {
    let _ = app.emit(REKORDBOX_EXPORT_PROGRESS, event);
}

fn progress_event(track: &TrackCore, total: u32, status: RekordboxExportStatus, error: Option<String>) -> RekordboxExportProgressEvent {
    RekordboxExportProgressEvent { track_id: track.track_id.clone(), track_title: track.title.clone(), status, total_tracks: total, error }
}

enum DownloadOutcome {
    Ok(PathBuf),
    Failed(String),
    Cancelled,
}

async fn download_track(
    app: &tauri::AppHandle, track: &TrackCore, output_dir: PathBuf, oauth_token: Option<String>, existing_path: Option<PathBuf>, total: u32,
    cancellation: Option<CancellationHandles>,
) -> DownloadOutcome {
    emit_progress(app, progress_event(track, total, RekordboxExportStatus::Downloading, None));

    if let Some(path) = existing_path {
        emit_progress(app, progress_event(track, total, RekordboxExportStatus::Downloaded, None));
        return DownloadOutcome::Ok(path);
    }

    let metadata = TrackMetadata {
        title: track.title.clone(),
        artist: track.artist.clone(),
        album: None,
        track_number: None,
        total_tracks: None,
        artwork_url: track.artwork_url.clone(),
        track_id: Some(track.track_id.clone()),
    };

    let config = PipelineConfig {
        track_url: track.track_url.clone(),
        track_id: track.track_id.clone(),
        output_dir,
        metadata,
        playlist_context: None,
        duration_ms: track.duration_ms,
        oauth_token,
        download_url: track.download_url.clone(),
        secret_token: track.secret_token.clone(),
    };

    match download_and_convert(app, config, cancellation).await {
        Ok(path) => {
            emit_progress(app, progress_event(track, total, RekordboxExportStatus::Downloaded, None));
            DownloadOutcome::Ok(path)
        }
        Err(DownloadError::Cancelled) => DownloadOutcome::Cancelled,
        Err(e) => {
            let err_msg = e.to_string();
            emit_progress(app, progress_event(track, total, RekordboxExportStatus::Error, Some(err_msg.clone())));
            DownloadOutcome::Failed(format!("{}: download failed — {}", track.title, err_msg))
        }
    }
}

async fn resolve_track_sources(
    app: &tauri::AppHandle, tracks: Vec<TrackCore>, output_dir: &Path, scan_dir: &Path, total: u32, max_concurrent: usize,
    cancel_state: &RekordboxExportCancellation,
) -> Result<(Vec<(TrackCore, PathBuf)>, Vec<String>, bool), ErrorResponse> {
    tokio::fs::create_dir_all(output_dir)
        .await
        .map_err(|e| ErrorResponse { code: "DOWNLOAD_PATH_ERROR".to_string(), message: format!("Failed to create export downloads directory: {}", e) })?;

    let track_ids: Vec<String> = tracks.iter().map(|t| t.track_id.clone()).collect();
    let scan_dir = scan_dir.to_path_buf();
    let existing = tokio::task::spawn_blocking(move || scan_existing_track_ids(&scan_dir, &track_ids, true))
        .await
        .map_err(|e| ErrorResponse { code: "SCAN_ERROR".to_string(), message: e.to_string() })?;
    let oauth_token = app.state::<AuthState>().get_token();

    for track in &tracks {
        emit_progress(app, progress_event(track, total, RekordboxExportStatus::Pending, None));
    }

    let semaphore = Arc::new(Semaphore::new(max_concurrent));
    let active_processes = cancel_state.active_processes();
    let mut join_set: JoinSet<(usize, TrackCore, DownloadOutcome)> = JoinSet::new();

    for (idx, track) in tracks.into_iter().enumerate() {
        if cancel_state.is_cancelled() {
            break;
        }

        let sem = semaphore.clone();
        let app_clone = app.clone();
        let output = output_dir.to_path_buf();
        let token = oauth_token.clone();
        let existing_path = existing.get(&track.track_id).cloned();
        let worker_cancel_rx = cancel_state.subscribe();
        let procs = active_processes.clone();
        let track_id = track.track_id.clone();

        join_set.spawn(async move {
            let _permit = sem.acquire().await.expect("semaphore closed");

            let child_handle = Arc::new(Mutex::new(None));
            let pid_handle = Arc::new(Mutex::new(None));
            procs.lock().await.insert(track_id.clone(), ActiveProcess { child: child_handle.clone(), pid: pid_handle.clone() });

            let cancellation = CancellationHandles { cancel_rx: worker_cancel_rx, active_child: child_handle, active_pid: pid_handle };

            let result = download_track(&app_clone, &track, output, token, existing_path, total, Some(cancellation)).await;
            procs.lock().await.remove(&track_id);
            (idx, track, result)
        });
    }

    let mut results: Vec<Option<(TrackCore, PathBuf)>> = (0..total as usize).map(|_| None).collect();
    let mut errors: Vec<String> = Vec::new();
    let mut was_cancelled = false;

    while let Some(outcome) = join_set.join_next().await {
        if cancel_state.is_cancelled() && !was_cancelled {
            was_cancelled = true;
            cancel_state.kill_active_processes().await;
        }

        let (idx, track, result) = outcome.map_err(|e| ErrorResponse { code: "TASK_JOIN_ERROR".to_string(), message: e.to_string() })?;
        match result {
            DownloadOutcome::Ok(path) => {
                results[idx] = Some((track, path));
            }
            DownloadOutcome::Failed(msg) => {
                errors.push(msg);
            }
            DownloadOutcome::Cancelled => {}
        }
    }

    let pairs: Vec<(TrackCore, PathBuf)> = results.into_iter().flatten().collect();
    Ok((pairs, errors, was_cancelled))
}

#[tauri::command]
#[specta::specta]
pub async fn export_playlist_to_rekordbox(
    tracks: Vec<TrackCore>, playlist_name: String, parent_folder_id: Option<String>, max_concurrent: u32, manual_db_path: Option<String>,
    app: tauri::AppHandle, cancel_state: State<'_, RekordboxExportCancellation>,
) -> Result<ExportResult, ErrorResponse> {
    cancel_state.reset();

    log::info!("[rekordbox-export] Starting export of {} tracks to playlist '{}'", tracks.len(), playlist_name);

    let prepare_app = app.clone();
    log::info!("[rekordbox-export] Preparing write context...");
    let ctx = tokio::task::spawn_blocking(move || RekordboxWriteContext::prepare(manual_db_path, &prepare_app)).await.map_err(|e| {
        log::error!("[rekordbox-export] spawn_blocking join error during prepare: {}", e);
        ErrorResponse { code: "TASK_JOIN_ERROR".to_string(), message: e.to_string() }
    })??;

    log::info!("[rekordbox-export] Write context prepared. App data dir: {:?}", ctx.app_data_dir);

    let total = tracks.len() as u32;
    let export_dl_dir = ctx.app_data_dir.join(EXPORT_DOWNLOADS_DIR);
    let rekordbox_tracks_dir = file_manager::get_rekordbox_tracks_dir(&ctx.app_data_dir);
    let max_concurrent = max_concurrent.clamp(1, 10) as usize;

    log::info!("[rekordbox-export] Resolving track sources (download dir: {:?})...", export_dl_dir);
    let cancelled_err = || ErrorResponse { code: "CANCELLED".to_string(), message: "Export cancelled".to_string() };

    let (resolved, download_errors, was_cancelled) =
        resolve_track_sources(&app, tracks, &export_dl_dir, &rekordbox_tracks_dir, total, max_concurrent, &cancel_state).await?;

    if was_cancelled {
        log::info!("[rekordbox-export] Export cancelled during download phase");
        return Err(cancelled_err());
    }

    log::info!("[rekordbox-export] Track sources resolved: {} successful, {} errors", resolved.len(), download_errors.len());

    if cancel_state.is_cancelled() {
        log::info!("[rekordbox-export] Export cancelled before database phase");
        return Err(cancelled_err());
    }

    log::info!("[rekordbox-export] Starting database export phase...");
    tokio::task::spawn_blocking(move || {
        ctx.handle_result((|| -> Result<ExportResult, RekordboxError> {
            log::info!("[rekordbox-export] Opening database session...");
            let mut session = ctx.open_session()?;
            log::info!("[rekordbox-export] Database session opened successfully");

            log::info!("[rekordbox-export] Initializing InfraBooth folder...");
            let infrabooth_folder = session.init_infrabooth_folder()?;
            log::info!("[rekordbox-export] InfraBooth folder initialized: id={}", infrabooth_folder.id);

            let target_parent_id = parent_folder_id.as_deref().unwrap_or("root");

            log::info!("[rekordbox-export] Finding/creating playlist '{}'...", playlist_name);
            let named_pl = session.find_or_create_playlist(&playlist_name, target_parent_id)?;
            log::info!("[rekordbox-export] Playlist ready: id={}, name={}", named_pl.id, named_pl.name);

            log::info!("[rekordbox-export] Finding/creating all-tracks playlist...");
            let all_tracks_pl = session.find_or_create_playlist(ALL_TRACKS_PLAYLIST_NAME, &infrabooth_folder.id)?;
            log::info!("[rekordbox-export] All-tracks playlist ready: id={}", all_tracks_pl.id);

            let rekordbox_tracks_dir = file_manager::get_rekordbox_tracks_dir(&ctx.app_data_dir);
            log::info!("[rekordbox-export] Rekordbox tracks dir: {:?}", rekordbox_tracks_dir);

            let mut exported_count = 0i32;
            let mut skipped_count = 0i32;
            let mut errors: Vec<String> = download_errors;

            log::info!("[rekordbox-export] Starting to export {} tracks...", resolved.len());
            for (idx, (track, source_path)) in resolved.iter().enumerate() {
                log::info!("[rekordbox-export] Exporting track {}/{}: {} (source: {:?})", idx + 1, resolved.len(), track.title, source_path);
                emit_progress(&app, progress_event(track, total, RekordboxExportStatus::Exporting, None));

                let export_req = ExportTrackRequest { source_path: source_path.to_string_lossy().to_string() };

                match export_single_track(&mut session.db, &export_req, &named_pl.id, &rekordbox_tracks_dir) {
                    Ok((exported, content_id)) => {
                        if exported {
                            exported_count += 1;
                            log::info!("[rekordbox-export] Track exported: content_id={}", content_id);
                        } else {
                            skipped_count += 1;
                            log::info!("[rekordbox-export] Track skipped (already exists): content_id={}", content_id);
                        }

                        log::debug!("[rekordbox-export] Checking if track is in all-tracks playlist...");
                        if !is_content_in_playlist(&session.db, &all_tracks_pl.id, &content_id)
                            .map_err(|e| RekordboxError::DatabaseError(format!("all_tracks check failed: {}", e)))?
                        {
                            log::debug!("[rekordbox-export] Adding track to all-tracks playlist...");
                            playlist::add_to_playlist(&mut session.db, &all_tracks_pl.id, &content_id, None)
                                .map_err(|e| RekordboxError::DatabaseError(format!("add to all_tracks failed: {}", e)))?;
                        }

                        emit_progress(&app, progress_event(track, total, RekordboxExportStatus::Completed, None));
                    }
                    Err(e) => {
                        log::error!("[rekordbox-export] Track export failed: {}", e);
                        errors.push(e);
                    }
                }
            }

            log::info!("[rekordbox-export] Export loop complete. Exported: {}, Skipped: {}, Errors: {}", exported_count, skipped_count, errors.len());

            log::info!("[rekordbox-export] Committing database session...");
            session.commit()?;
            log::info!("[rekordbox-export] Database session committed successfully");

            Ok(ExportResult { exported_count, skipped_count, playlist_name: named_pl.name, errors })
        })())
    })
    .await
    .map_err(|e| {
        log::error!("[rekordbox-export] spawn_blocking join error during export: {}", e);
        ErrorResponse { code: "TASK_JOIN_ERROR".to_string(), message: e.to_string() }
    })?
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_rekordbox_export(cancel_state: State<'_, RekordboxExportCancellation>) -> Result<(), ErrorResponse> {
    log::info!("[rekordbox-export] Cancelling export");
    cancel_state.cancel();
    cancel_state.kill_active_processes().await;
    Ok(())
}
