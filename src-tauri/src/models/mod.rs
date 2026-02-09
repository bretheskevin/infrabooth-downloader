pub mod error;
pub mod url;

pub use error::{AuthError, ErrorResponse, YtDlpError};
pub use url::{UrlType, ValidationError, ValidationResult};
