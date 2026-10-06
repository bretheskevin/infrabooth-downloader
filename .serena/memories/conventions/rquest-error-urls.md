# rquest errors leak signed URLs

`rquest::Error`'s `Display` appends ` for url (<full url>)`, so `e.to_string()` on a CDN fetch error
writes the whole signed URL (Policy/Signature query) into logs and any user-facing message built from it.
Always call `e.without_url()` before formatting (see `services/player/fetch.rs::network_failure`).
For URLs we log ourselves, use `services::player::url_prefix` (first 80 chars).
