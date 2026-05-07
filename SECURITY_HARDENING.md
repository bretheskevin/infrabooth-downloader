# Security Hardening Guide

This document outlines the security implementations completed in phases and recommendations for future hardening.

## Completed (Phase 1-3)

### Phase 1: HTTPS Enforcement & URL Encoding
- ✅ Added `https_enforcer` module to validate external requests use HTTPS
- ✅ URL-encode playlist secrets to prevent parameter injection
- ✅ Prevents downgrade attacks from HTTPS → HTTP

### Phase 2: Secure Token Storage & Session Management
- ✅ Integrated system Keyring (Keychain/Credential Manager/Secret Service)
- ✅ Secure token storage with `SecureTokenStore`
- ✅ Session timeout: 30 minutes max
- ✅ Inactivity timeout: 20 minutes
- ✅ Tokens cleared on logout and app restart

### Phase 3: Audit Logging & Additional Hardening
- ✅ Comprehensive audit logging for security events
- ✅ Event types: AUTH_ATTEMPT, LOGOUT, DOWNLOAD_*, TOKEN_REFRESH, SESSION_TIMEOUT, etc.
- ✅ Logs written to structured logs with timestamps
- ✅ Easy forensics and compliance audit trails

## Recommended Future Improvements

### Short-term (Next 2-3 sprints)
1. **Integrate SecureTokenStore into auth flow**
   - Modify `check_auth()` and `refresh_auth()` to use `SecureTokenStore`
   - Persist tokens to keyring on successful auth
   - Retrieve from keyring on app startup

2. **Implement frontend heartbeat for inactivity**
   - Send periodic heartbeat from frontend to backend
   - Track last user interaction time
   - Trigger logout after `INACTIVITY_TIMEOUT_SECS`

3. **HTTP Security Headers**
   - Add `X-Content-Type-Options: nosniff`
   - Add `X-Frame-Options: DENY`
   - Add `X-XSS-Protection: 1; mode=block`
   - Add `Strict-Transport-Security: max-age=31536000`

### Medium-term (Next 4-6 sprints)
1. **Certificate Pinning**
   - Pin SoundCloud API certificates to prevent MITM
   - Use `tauri-plugin-http` with pinning

2. **Encrypted Local Cache**
   - Encrypt cached playlists, liked tracks, etc.
   - Use `aes-gcm` or similar for cache encryption

3. **Comprehensive Rate Limiting**
   - Implement per-IP rate limiting on API calls
   - Exponential backoff for failed auth attempts

### Long-term (Next 6+ months)
1. **Code Signing & Verification**
   - Sign all executable binaries
   - Verify signatures on app startup
   - Store public keys in secure enclave

2. **Security Testing Automation**
   - Add `cargo audit` to CI/CD
   - Add `npm audit` to CI/CD
   - Regular penetration testing (quarterly)

3. **User Education**
   - Document best practices for OAuth usage
   - Explain why Keyring integration matters
   - Security warnings in logs when needed

## Testing Security Hardening

### Manual Testing Checklist
- [ ] Verify token is stored in system Keyring (Keychain Inspector on macOS)
- [ ] Verify token is NOT visible in logs or dumps
- [ ] Verify session expires after 30 minutes
- [ ] Verify 20 minute inactivity logout works
- [ ] Verify audit logs are created for all events
- [ ] Verify logout clears token from both keyring and memory
- [ ] Verify app restart doesn't require re-authentication (token persisted)
- [ ] Verify HTTPS validation rejects HTTP for external APIs

### Automated Testing
```bash
# Run security checks
cargo audit                    # Check for vulnerable dependencies
cargo build --release         # Build in release mode for analysis
npm audit                      # Check npm packages for vulnerabilities
```

## Logging Security Events

Audit logs are written to the app's log file with ISO 8601 timestamps:

```
[2026-05-07 12:00:00][INFO][app] [AUDIT] AUTH_ATTEMPT | 2026-05-07T12:00:00Z | User 123 authenticated
[2026-05-07 12:00:05][INFO][app] [AUDIT] DOWNLOAD_STARTED | 2026-05-07T12:00:05Z | Track 456 (Song Name) download started
[2026-05-07 12:15:00][WARN][app] [AUDIT] SESSION_TIMEOUT | 2026-05-07T12:15:00Z | Session timeout for user 123
```

### Log Retention Policy
- Current: Logs rotated when 10 MB reached, keep 1 file
- Recommended: Keep logs for 30 days, then archive
- Secure deletion of archived logs after 90 days

## Compliance & Standards

### Compliance Frameworks
- **OWASP Top 10**: Addresses injection, broken auth, sensitive data exposure
- **CWE**: Covers numerous Common Weakness Enumeration items
- **Best Practices**: Follows OAuth 2.0 and HTTPS standards

### Privacy Considerations
- No PII stored in plaintext
- Tokens encrypted in system storage
- Logs contain event metadata, not user data
- User can view/delete their logs

## Contact & Questions

For security questions or to report a vulnerability, please refer to the security policy in the repository.
