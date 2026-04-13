use std::collections::HashMap;
use std::sync::Arc;
use tauri_plugin_shell::process::CommandChild;
use tokio::sync::{watch, Mutex};

/// A single active download process (ffmpeg child + PID).
pub struct ActiveProcess {
    pub child: Arc<Mutex<Option<CommandChild>>>,
    pub pid: Arc<Mutex<Option<u32>>>,
}

pub struct CancellationState {
    sender: watch::Sender<bool>,
    receiver: watch::Receiver<bool>,
    active_processes: Arc<Mutex<HashMap<String, ActiveProcess>>>,
}

impl CancellationState {
    pub fn new() -> Self {
        let (sender, receiver) = watch::channel(false);
        Self { sender, receiver, active_processes: Arc::new(Mutex::new(HashMap::new())) }
    }

    pub fn subscribe(&self) -> watch::Receiver<bool> {
        self.receiver.clone()
    }

    pub fn cancel(&self) {
        let _ = self.sender.send(true);
    }

    pub fn reset(&self) {
        let _ = self.sender.send(false);
    }

    pub fn active_processes(&self) -> Arc<Mutex<HashMap<String, ActiveProcess>>> {
        self.active_processes.clone()
    }

    pub async fn kill_active_processes(&self) {
        let mut processes = self.active_processes.lock().await;
        for (track_id, proc) in processes.iter() {
            log::info!("[cancel] Killing process for track {}", track_id);
            // Kill PID tree first
            if let Some(pid) = proc.pid.lock().await.take() {
                kill_process_tree(pid);
            }
            // Kill CommandChild
            if let Some(child) = proc.child.lock().await.take() {
                let _ = child.kill();
            }
        }
        processes.clear();
    }
}

impl Default for CancellationState {
    fn default() -> Self {
        Self::new()
    }
}

/// Kill a process and all its children
fn kill_process_tree(pid: u32) {
    log::info!("[cancellation] Killing process tree for PID {}", pid);

    #[cfg(unix)]
    {
        use std::process::Command;

        // Try pkill to kill all child processes first
        let _ = Command::new("pkill").args(["-9", "-P", &pid.to_string()]).output();

        // Then kill the main process
        let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();

        log::info!("[cancellation] Sent SIGKILL to process {} and children", pid);
    }

    #[cfg(windows)]
    {
        use std::process::Command;

        // On Windows, use taskkill with /T to kill the process tree
        let _ = Command::new("taskkill").args(["/F", "/T", "/PID", &pid.to_string()]).output();

        log::info!("[cancellation] Sent taskkill to process {} and children", pid);
    }
}
