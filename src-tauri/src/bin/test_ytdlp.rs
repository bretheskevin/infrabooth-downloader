//! Test binary to debug yt-dlp and ffmpeg paths
//!
//! Run with: cargo run --bin test_ytdlp

use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("=== yt-dlp / ffmpeg Path Debug Tool ===\n");

    // 1. Check current executable path
    let exe_path = std::env::current_exe().expect("Failed to get exe path");
    let exe_dir = exe_path.parent().expect("Failed to get exe dir");
    println!("Executable path: {:?}", exe_path);
    println!("Executable dir: {:?}", exe_dir);

    // 2. List contents of exe directory
    println!("\n--- Contents of executable directory ---");
    if let Ok(entries) = std::fs::read_dir(exe_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            if name.to_string_lossy().contains("ffmpeg") || name.to_string_lossy().contains("yt-dlp")
            {
                println!("  [SIDECAR] {:?}", name);
            }
        }
    }

    // 3. Try to find ffmpeg with various naming conventions
    println!("\n--- Searching for ffmpeg ---");
    let ffmpeg_names = [
        "ffmpeg-aarch64-apple-darwin",
        "ffmpeg-x86_64-apple-darwin",
        "ffmpeg",
    ];

    let mut ffmpeg_path: Option<PathBuf> = None;
    for name in &ffmpeg_names {
        let path = exe_dir.join(name);
        let exists = path.exists();
        println!("  {} -> exists: {}", name, exists);
        if exists && ffmpeg_path.is_none() {
            ffmpeg_path = Some(path);
        }
    }

    // 4. Try to find yt-dlp
    println!("\n--- Searching for yt-dlp ---");
    let ytdlp_names = [
        "yt-dlp-aarch64-apple-darwin",
        "yt-dlp-x86_64-apple-darwin",
        "yt-dlp",
    ];

    let mut ytdlp_path: Option<PathBuf> = None;
    for name in &ytdlp_names {
        let path = exe_dir.join(name);
        let exists = path.exists();
        println!("  {} -> exists: {}", name, exists);
        if exists && ytdlp_path.is_none() {
            ytdlp_path = Some(path);
        }
    }

    // 5. Also check the binaries directory relative to project
    println!("\n--- Checking src-tauri/binaries/ ---");
    let project_binaries = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries");
    println!("Project binaries dir: {:?}", project_binaries);
    if project_binaries.exists() {
        if let Ok(entries) = std::fs::read_dir(&project_binaries) {
            for entry in entries.flatten() {
                println!("  {:?}", entry.file_name());
            }
        }

        // Use project binaries if exe dir doesn't have them
        if ffmpeg_path.is_none() {
            let path = project_binaries.join("ffmpeg-aarch64-apple-darwin");
            if path.exists() {
                ffmpeg_path = Some(path);
                println!("\n  -> Using ffmpeg from project binaries");
            }
        }
        if ytdlp_path.is_none() {
            let path = project_binaries.join("yt-dlp-aarch64-apple-darwin");
            if path.exists() {
                ytdlp_path = Some(path);
                println!("  -> Using yt-dlp from project binaries");
            }
        }
    }

    // 6. Test yt-dlp version
    println!("\n--- Testing yt-dlp --version ---");
    if let Some(ref ytdlp) = ytdlp_path {
        match Command::new(ytdlp).arg("--version").output() {
            Ok(output) => {
                println!(
                    "  Version: {}",
                    String::from_utf8_lossy(&output.stdout).trim()
                );
            }
            Err(e) => println!("  Error: {}", e),
        }
    } else {
        println!("  yt-dlp not found!");
    }

    // 7. Test ffmpeg version
    println!("\n--- Testing ffmpeg -version ---");
    if let Some(ref ffmpeg) = ffmpeg_path {
        match Command::new(ffmpeg).arg("-version").output() {
            Ok(output) => {
                let version_line = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or("unknown")
                    .to_string();
                println!("  {}", version_line);
            }
            Err(e) => println!("  Error: {}", e),
        }
    } else {
        println!("  ffmpeg not found!");
    }

    // 8. Test a simple yt-dlp download with ffmpeg-location
    println!("\n--- Testing yt-dlp with --ffmpeg-location ---");
    if let (Some(ytdlp), Some(ffmpeg)) = (&ytdlp_path, &ffmpeg_path) {
        // Just test that the command can be constructed - don't actually download
        println!("  Would run: {:?} --ffmpeg-location {:?} ...", ytdlp, ffmpeg);

        // Test with a simple extraction (no download)
        let test_url = "https://soundcloud.com/majorlazer/lean-on-feat-mo-dj-snake";
        println!("\n--- Testing URL extraction (no download) ---");
        println!("  URL: {}", test_url);

        let output = Command::new(ytdlp)
            .args([
                "--ffmpeg-location",
                ffmpeg.to_str().unwrap(),
                "-j", // JSON output, no download
                "--no-download",
                test_url,
            ])
            .output();

        match output {
            Ok(result) => {
                if result.status.success() {
                    println!("  SUCCESS: URL extraction worked!");
                    // Parse JSON to show title
                    if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&result.stdout) {
                        if let Some(title) = json.get("title").and_then(|v| v.as_str()) {
                            println!("  Track title: {}", title);
                        }
                    }
                } else {
                    println!(
                        "  FAILED: {}",
                        String::from_utf8_lossy(&result.stderr).trim()
                    );
                }
            }
            Err(e) => println!("  Error running command: {}", e),
        }
    }

    println!("\n=== Done ===");
}
