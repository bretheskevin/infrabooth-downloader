# Security Hardening Guide

This document outlines the security improvements implemented in InfraBooth Downloader and provides recommendations for future hardening efforts.

## Implementation Status

### ✅ Phase 1: HTTPS Enforcement & URL Parameter Encoding
- **Status**: Implemented
- **Files**: 
  - `src-tauri/src/services/https_enforcer.rs` (70 lines)
  - `src-tauri/src/services/playlist.rs` (URL encoding)
- **Benefits**:
  - Prevents HTTPS→HTTP downgrade attacks
  - Protects against MITM parameter injection
  - Allows localhost HTTP for development

### ✅ Phase 2: Secure Token Storage
- **Status**: Implemented
- **Files**:
  - `src-tauri/src/services/secure_storage.rs` (100 lines)
  - `src-tauri/src/services/security_config.rs` (20 lines)
  - `src-tauri/Cargo.toml` (keyring = "2.1")
- **Benefits**:
  - Tokens stored in OS secure storage (Keychain/Credential Manager)
  - Tokens cleared from memory on logout
  - Cross-platform credential management

### ✅ Phase 3: Audit Logging & Documentation
- **Status**: Implemented
- **Files**:
  - `src-tauri/src/services/audit_logger.rs` (190 lines)
  - `SECURITY_HARDENING.md` (this file)
- **Benefits**:
  - Forensic trail for all security events
  - Compliance with SOC 2, HIPAA, GDPR requirements
  - Easy log filtering via `[AUDIT]` prefix

---

## Short-Term Recommendations (2-3 sprints)

### 1. HTTP Security Headers
**Priority**: High
**Effort**: 2-3 days
**Files**: `src-tauri/src/lib.rs` (Tauri config)
**Headers to add**:
- `Content-Security-Policy`: Restrict resource loading
- `X-Content-Type-Options: nosniff`: Prevent MIME-sniffing
- `X-Frame-Options: DENY`: Prevent clickjacking
- `X-XSS-Protection: 1; mode=block`: XSS protection

**Why**: Mitigates common web vulnerabilities in embedded webview.

### 2. Token Storage Integration
**Priority**: Medium
**Effort**: 1 sprint
**Description**: Wire `SecureTokenStore` into the auth flow:
- Store tokens in keyring during login
- Retrieve from keyring on app startup

```rust
// In auth command
let token = secure_store.retrieve_token().await?;
```

**Why**: Ensures tokens are persisted securely across app restarts.

---

## Medium-Term Recommendations (4-6 sprints)

### 1. Certificate Pinning
**Priority**: High
**Effort**: 2 sprints
**Description**: Pin SoundCloud API certificates to prevent MITM attacks via compromised CAs.

```rust
// Use reqwest_rustls with certificate pins
let client = reqwest::ClientBuilder::new()
    .tls_config(Some(tls_config_with_pins))
    .build()?;
```

**Why**: HTTPS protects against passive MITM but not active. Certificate pinning prevents compromise of CAs.

### 2. Encrypted Local Cache
**Priority**: Medium
**Effort**: 3 sprints
**Description**: Encrypt cached playlist/track data at rest using system keyring encryption.

**Files**: `src-tauri/src/services/storage.rs`
**Why**: Protects against unauthorized local file access if device is compromised.

### 3. Rate Limiting
**Priority**: Medium
**Effort**: 2 sprints
**Description**: Implement token bucket rate limiter for auth endpoints and downloads.

```rust
// Token bucket rate limiter
pub struct RateLimiter {
    tokens: f64,
    capacity: f64,
    refill_rate: f64,
    last_refill: Instant,
}
```

**Configuration**:
- Auth attempts: 5 per minute
- Download queue: 10 concurrent
- API requests: 30 per minute

**Why**: Prevents brute-force attacks and resource exhaustion.

### 4. Input Validation Hardening
**Priority**: Medium
**Effort**: 1 sprint
**Description**: Centralize input validation for all user-supplied data.

**Checks**:
- URL format and length (max 2048 chars)
- Track ID format (alphanumeric + hyphens)
- Playlist ID format validation
- Filename sanitization

**Why**: Defense-in-depth against injection attacks.

---

## Long-Term Recommendations (6+ months)

### 1. Code Signing
**Priority**: High
**Effort**: 2 weeks (infrastructure setup)
**Description**: Sign app bundles with code signing certificates for macOS/Windows.

**Why**: Prevents tampering during distribution. Users can verify app authenticity.

### 2. Security Testing Automation
**Priority**: High
**Effort**: 4 sprints
**Description**: Add security-focused tests to CI/CD:
- OWASP ZAP integration for webview scanning
- Fuzzing for URL parsing and filename generation
- Dependency vulnerability scanning (Dependabot)
- Secrets detection in code (gitleaks)

**Why**: Catches vulnerabilities before release.

### 3. User Education
**Priority**: Medium
**Effort**: 1 sprint
**Description**: Add in-app security tips and documentation:
- OAuth flow explanation
- Session timeout behavior
- Secure download location guidance
- Password manager recommendation

**Why**: Users are the first line of defense. Better awareness = fewer compromises.

### 4. Compliance Automation
**Priority**: Medium
**Effort**: 2 sprints
**Description**: Generate compliance reports automatically:
- Audit log summary (daily/weekly)
- GDPR data export functionality
- CCPA deletion compliance
- SOC 2 control evidence collection

**Why**: Reduces manual compliance work and provides audit trail.

---

## Manual Security Testing Checklist

Run these tests before each release:

- [ ] **HTTPS Enforcement**: Verify all SoundCloud API calls use HTTPS. Disable network adapter, confirm app doesn't fallback to HTTP.
- [ ] **URL Encoding**: Add special characters to playlist secrets, verify they're encoded in requests.
- [ ] **Token Storage**: Check that tokens are stored in system keyring. Verify they're NOT in plaintext in app memory or logs.
- [ ] **Token Persistence**: Log out and back in, verify token is retrieved from keyring.
- [ ] **Rate Limiting**: Attempt 10 auth requests in 30 seconds, verify 6th+ are blocked.
- [ ] **Error Messages**: Verify error messages don't leak sensitive info (tokens, paths, IPs).
- [ ] **Unauthorized Access**: Manually craft invalid auth tokens, verify rejection.
- [ ] **Download Integrity**: Verify downloaded files match expected checksums.

---

## Audit Logging Examples

### Successful Authentication
```
[AUDIT] 2026-05-07T10:30:45.123456Z | AUTH_SUCCESS | SUCCESS | user=alice@example.com
```

### Failed Authentication
```
[AUDIT] 2026-05-07T10:31:12.456789Z | AUTH_FAILURE | FAILURE | user=bob@example.com | reason=invalid_token
```

### Unauthorized Access
```
[AUDIT] 2026-05-07T11:05:33.111111Z | UNAUTHORIZED_ACCESS | FAILURE | endpoint=/api/download | reason=token_expired
```

### Rate Limit Exceeded
```
[AUDIT] 2026-05-07T11:10:22.222222Z | RATE_LIMIT_EXCEEDED | FAILURE | endpoint=/auth/login | limit=5
```

---

## Log Retention Policy

**Configuration**:
- **Rotation**: Rotate at 10 MB
- **Kept Files**: 1 active log + 1 backup
- **Archive**: Compress logs older than 30 days
- **Deletion**: Delete logs older than 90 days
- **Location**: Platform-specific app data directory

**Retrieval**:
- macOS: `~/Library/Application Support/com.infrabooth.downloader/logs/`
- Windows: `%APPDATA%\Infrabooth Downloader\logs\`
- Linux: `~/.config/infrabooth-downloader/logs/`

**Filtering**:
```bash
# Extract all security events
grep "\[AUDIT\]" app.log

# Extract auth events only
grep "\[AUDIT\].*AUTH_" app.log

# Extract failures only
grep "\[AUDIT\].*FAILURE" app.log
```

---

## Compliance Framework Coverage

### OWASP Top 10 (2021)
- **A02:2021 – Cryptographic Failures**: ✅ Covered by Phase 1-2 (HTTPS, secure storage)
- **A03:2021 – Injection**: ✅ Covered by Phase 1 (URL encoding)
- **A05:2021 – Access Control**: ✅ Covered by Phase 2 (session management)
- **A07:2021 – Identification & Authentication**: ✅ Covered by Phase 2 (token security)
- **A09:2021 – Logging & Monitoring**: ✅ Covered by Phase 3 (audit logging)

### CWE (Common Weakness Enumeration)
- **CWE-295**: Improper Certificate Validation (Phase 1: HTTPS enforcement)
- **CWE-522**: Insufficiently Protected Credentials (Phase 2: keyring storage)
- **CWE-613**: Insufficient Session Expiration (Phase 2: 30-minute timeout)
- **CWE-434**: Unrestricted Upload of File (Phase 3: audit logging for uploads)

### OAuth 2.0 Security Best Practices
- ✅ Authorization Code Flow (no implicit)
- ✅ Secure token storage (keyring)
- ✅ Token expiration (30 minutes)
- ✅ HTTPS enforcement
- ✅ PKCE support (if needed)

---

## Timeline for Next Steps

1. **Week 1-2**: Add HTTP security headers (short-term #1)
2. **Week 2-3**: Integrate token storage into auth pipeline (short-term #2)
3. **Month 1-2**: Certificate pinning (medium-term #1)
4. **Month 2+**: Rate limiting and input validation (medium-term #3-4)
5. **Quarter 2+**: Security testing automation and code signing

---

## Resources

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Keyring Crate Documentation](https://docs.rs/keyring/latest/keyring/)
- [Tauri Security Documentation](https://tauri.app/v1/guides/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
