use std::io::{self, Write};
use std::path::{Path, PathBuf};

pub fn write_atomic_private(dir: &Path, file_name: &str, contents: &[u8]) -> io::Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let mut temp = tempfile::NamedTempFile::new_in(dir)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        temp.as_file().set_permissions(std::fs::Permissions::from_mode(0o600))?;
    }
    temp.write_all(contents)?;
    temp.as_file().sync_all()?;
    let path = dir.join(file_name);
    temp.persist(&path).map_err(|e| e.error)?;
    Ok(path)
}

pub fn describe_io_error(e: &io::Error) -> String {
    format!("kind={:?} os_error={:?} {e}", e.kind(), e.raw_os_error())
}

pub async fn write_off_thread<F>(tag: &str, what: &str, dir: PathBuf, write: F) -> Option<PathBuf>
where
    F: FnOnce(&Path) -> io::Result<PathBuf> + Send + 'static,
{
    let write_dir = dir.clone();
    match tokio::task::spawn_blocking(move || write(&write_dir)).await {
        Ok(Ok(path)) => Some(path),
        Ok(Err(e)) => {
            log::error!("[{tag}] {what} write failed in {}: {}", dir.display(), describe_io_error(&e));
            None
        }
        Err(e) => {
            log::error!("[{tag}] {what} write task failed in {}: {e}", dir.display());
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    type TestResult<T = ()> = Result<T, Box<dyn std::error::Error>>;

    #[test]
    fn writes_contents_and_creates_missing_dir() -> TestResult {
        let dir = tempdir()?;
        let nested = dir.path().join("a").join("b");
        let path = write_atomic_private(&nested, "f.json", b"hello")?;
        assert_eq!(path, nested.join("f.json"));
        assert_eq!(std::fs::read(&path)?, b"hello");
        Ok(())
    }

    #[test]
    fn replaces_existing_file_without_leftovers() -> TestResult {
        let dir = tempdir()?;
        write_atomic_private(dir.path(), "f", b"old")?;
        let path = write_atomic_private(dir.path(), "f", b"new")?;
        assert_eq!(std::fs::read(&path)?, b"new");
        assert_eq!(std::fs::read_dir(dir.path())?.count(), 1);
        Ok(())
    }

    #[tokio::test]
    async fn write_off_thread_returns_written_path() -> TestResult {
        let dir = tempdir()?;
        let path = write_off_thread("test", "file", dir.path().to_path_buf(), |d| write_atomic_private(d, "f", b"x")).await;
        assert_eq!(path, Some(dir.path().join("f")));
        Ok(())
    }

    #[tokio::test]
    async fn write_off_thread_swallows_write_errors() {
        let path = write_off_thread("test", "file", PathBuf::from("/nonexistent"), |_| Err(io::Error::other("boom"))).await;
        assert_eq!(path, None);
    }

    #[cfg(unix)]
    #[test]
    fn file_is_owner_only() -> TestResult {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempdir()?;
        let path = write_atomic_private(dir.path(), "f", b"x")?;
        assert_eq!(std::fs::metadata(path)?.permissions().mode() & 0o777, 0o600);
        Ok(())
    }
}
