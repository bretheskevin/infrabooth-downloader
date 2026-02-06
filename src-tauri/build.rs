fn main() {
  // Load .env so SOUNDCLOUD_CLIENT_SECRET is available via env!() at compile time
  if let Ok(iter) = dotenvy::dotenv_iter() {
    for item in iter.flatten() {
      println!("cargo:rustc-env={}={}", item.0, item.1);
    }
  }
  println!("cargo:rerun-if-changed=.env");

  tauri_build::build()
}
