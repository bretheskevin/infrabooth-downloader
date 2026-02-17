use std::sync::Arc;
use tauri_plugin_shell::process::CommandChild;
use tokio::sync::{watch, Mutex};

pub struct CancellationState {
    sender: watch::Sender<bool>,
    receiver: watch::Receiver<bool>,
    active_child: Arc<Mutex<Option<CommandChild>>>,
    active_pid: Arc<Mutex<Option<u32>>>,
}

impl CancellationState {
    pub fn new() -> Self {
        let (sender, receiver) = watch::channel(false);
        Self {
            sender,
            receiver,
            active_child: Arc::new(Mutex::new(None)),
            active_pid: Arc::new(Mutex::new(None)),
        }
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

    pub fn active_child(&self) -> Arc<Mutex<Option<CommandChild>>> {
        self.active_child.clone()
    }

    pub fn active_pid(&self) -> Arc<Mutex<Option<u32>>> {
        self.active_pid.clone()
    }

    pub async fn kill_active_process(&self) {
        // First, try to kill the process group using the stored PID
        let pid = {
            let guard = self.active_pid.lock().await;
            *guard
        };

        if let Some(pid) = pid {
            kill_process_tree(pid);
        }

        // Also call kill on the CommandChild for good measure
        let mut guard = self.active_child.lock().await;
        if let Some(child) = guard.take() {
            let _ = child.kill();
            log::info!("[cancellation] Killed active yt-dlp process");
        }

        // Clear the PID
        let mut pid_guard = self.active_pid.lock().await;
        *pid_guard = None;
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
        let _ = Command::new("pkill")
            .args(["-9", "-P", &pid.to_string()])
            .output();

        // Then kill the main process
        let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();

        log::info!(
            "[cancellation] Sent SIGKILL to process {} and children",
            pid
        );
    }

    #[cfg(windows)]
    {
        use std::process::Command;

        // On Windows, use taskkill with /T to kill the process tree
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output();

        log::info!(
            "[cancellation] Sent taskkill to process {} and children",
            pid
        );
    }
}
