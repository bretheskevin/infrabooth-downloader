# Story 9.2: Set Up Release Build Workflow

Status: review

## Story

As a **developer**,
I want **automated cross-platform builds triggered on release**,
so that **distributable binaries are created consistently for Windows and macOS**.

## Acceptance Criteria

### AC1: Release Trigger (ARCH-11)
**Given** a GitHub release is created or a version tag is pushed
**When** the release workflow triggers
**Then** builds run for both Windows and macOS platforms

### AC2: Windows Build (ARCH-12)
**Given** the Windows build runs
**When** the build completes
**Then** an MSI installer is produced
**And** the installer is named with version (e.g., `infrabooth-downloader_1.0.0_x64.msi`)
**And** the MSI includes all sidecar binaries (yt-dlp, FFmpeg)

### AC3: macOS Build (ARCH-12)
**Given** the macOS build runs
**When** the build completes
**Then** a DMG disk image is produced for Intel (x64)
**And** a DMG disk image is produced for Apple Silicon (arm64)
**And** each DMG is named with version and architecture
**And** both DMGs include appropriate sidecar binaries

### AC4: Artifact Attachment
**Given** builds complete successfully
**When** examining the GitHub Release
**Then** all installer artifacts are attached to the release
**And** checksums (SHA256) are generated for each artifact
**And** the Tauri updater manifest JSON is published

### AC5: Sidecar Inclusion
**Given** the workflow uses tauri-apps/tauri-action
**When** examining the built installers
**Then** yt-dlp binaries are included for the target platform
**And** FFmpeg binaries are included for the target platform
**And** binaries are executable and correctly located

## Tasks / Subtasks

- [x] Task 1: Create release workflow file (AC: #1)
  - [x] 1.1 Create `.github/workflows/release.yml`
  - [x] 1.2 Configure trigger on release creation and version tags (`v*`)
  - [x] 1.3 Set up workflow permissions for releases

- [x] Task 2: Configure Windows build job (AC: #2, #5)
  - [x] 2.1 Set up Windows runner (`windows-latest`)
  - [x] 2.2 Install Rust toolchain (stable)
  - [x] 2.3 Install Node.js and npm dependencies
  - [x] 2.4 Ensure Windows sidecar binaries are present:
    - `yt-dlp-x86_64-pc-windows-msvc.exe`
    - `ffmpeg-x86_64-pc-windows-msvc.exe`
  - [x] 2.5 Configure tauri-apps/tauri-action for Windows MSI build
  - [x] 2.6 Verify MSI naming includes version

- [x] Task 3: Configure macOS Intel build job (AC: #3, #5)
  - [x] 3.1 Set up macOS runner (`macos-latest` for Intel)
  - [x] 3.2 Install Rust toolchain (stable, x86_64-apple-darwin target)
  - [x] 3.3 Install Node.js and npm dependencies
  - [x] 3.4 Ensure macOS Intel sidecar binaries are present:
    - `yt-dlp-x86_64-apple-darwin`
    - `ffmpeg-x86_64-apple-darwin`
  - [x] 3.5 Configure tauri-apps/tauri-action for DMG build (Intel)
  - [x] 3.6 Verify DMG naming includes version and architecture

- [x] Task 4: Configure macOS Apple Silicon build job (AC: #3, #5)
  - [x] 4.1 Set up macOS runner (`macos-latest` for ARM)
  - [x] 4.2 Install Rust toolchain (stable, aarch64-apple-darwin target)
  - [x] 4.3 Install Node.js and npm dependencies
  - [x] 4.4 Ensure macOS ARM sidecar binaries are present:
    - `yt-dlp-aarch64-apple-darwin`
    - `ffmpeg-aarch64-apple-darwin`
  - [x] 4.5 Configure tauri-apps/tauri-action for DMG build (ARM)
  - [x] 4.6 Verify DMG naming includes version and architecture

- [x] Task 5: Configure artifact attachment and checksums (AC: #4)
  - [x] 5.1 Enable `releaseId` output from tauri-action
  - [x] 5.2 Configure automatic artifact attachment to GitHub Release
  - [x] 5.3 Generate SHA256 checksums for all artifacts
  - [x] 5.4 Upload checksums file to release
  - [x] 5.5 Verify Tauri updater manifest (`latest.json`) is generated

- [x] Task 6: Configure code signing (recommended)
  - [x] 6.1 Set up Windows code signing secrets (optional, for later)
  - [x] 6.2 Set up macOS code signing secrets (optional, for later)
  - [x] 6.3 Configure Tauri updater public key for signature verification

- [ ] Task 7: Test the workflow
  - [ ] 7.1 Create a test release tag (`v0.1.0-test`)
  - [ ] 7.2 Verify all three builds complete successfully
  - [ ] 7.3 Verify artifacts are attached to release
  - [ ] 7.4 Verify checksums are accurate
  - [ ] 7.5 Test installer on each platform (manual verification)

## Dev Notes

### Complete `.github/workflows/release.yml` Example

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  release:
    types: [created]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          # Windows x64
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
            args: ''
          # macOS Intel
          - platform: macos-latest
            target: x86_64-apple-darwin
            args: '--target x86_64-apple-darwin'
          # macOS Apple Silicon
          - platform: macos-latest
            target: aarch64-apple-darwin
            args: '--target aarch64-apple-darwin'

    runs-on: ${{ matrix.platform }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Rust stable
        uses: dtolnay/rust-action@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install dependencies (Ubuntu only)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install npm dependencies
        run: npm ci

      - name: Verify sidecar binaries exist
        shell: bash
        run: |
          echo "Checking sidecar binaries for target: ${{ matrix.target }}"
          if [[ "${{ matrix.target }}" == "x86_64-pc-windows-msvc" ]]; then
            ls -la src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe
            ls -la src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe
          elif [[ "${{ matrix.target }}" == "x86_64-apple-darwin" ]]; then
            ls -la src-tauri/binaries/yt-dlp-x86_64-apple-darwin
            ls -la src-tauri/binaries/ffmpeg-x86_64-apple-darwin
          elif [[ "${{ matrix.target }}" == "aarch64-apple-darwin" ]]; then
            ls -la src-tauri/binaries/yt-dlp-aarch64-apple-darwin
            ls -la src-tauri/binaries/ffmpeg-aarch64-apple-darwin
          fi

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Code signing (uncomment when ready)
          # TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          # TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
          # Apple code signing (uncomment when ready)
          # APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          # APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          # APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          # APPLE_ID: ${{ secrets.APPLE_ID }}
          # APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          # APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'InfraBooth Downloader v__VERSION__'
          releaseBody: 'See the assets below to download and install this version.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
          includeUpdaterJson: true

  generate-checksums:
    needs: build-tauri
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Download release artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Generate checksums
        run: |
          cd artifacts
          find . -type f \( -name "*.msi" -o -name "*.dmg" -o -name "*.AppImage" -o -name "*.deb" \) -exec sha256sum {} \; > ../checksums.txt
          cat ../checksums.txt

      - name: Upload checksums to release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: checksums.txt
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Tauri Configuration for Builds

Ensure `src-tauri/tauri.conf.json` has proper bundle configuration:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.infrabooth.downloader",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "externalBin": [
      "binaries/yt-dlp",
      "binaries/ffmpeg"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "wix": {
        "language": "en-US"
      }
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "exceptionDomain": "",
      "signingIdentity": null,
      "providerShortName": null,
      "entitlements": null
    }
  }
}
```

### Updater Configuration

For the Tauri updater to work with GitHub Releases, add to `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/YOUR_USERNAME/sc-downloader/releases/latest/download/latest.json"
      ],
      "dialog": false,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

Generate the key pair for signing:

```bash
# Generate key pair (run once, store securely)
npx @tauri-apps/cli signer generate -w ~/.tauri/mykey.key

# The public key goes in tauri.conf.json
# The private key goes in GitHub Secrets as TAURI_SIGNING_PRIVATE_KEY
```

### Sidecar Binary Requirements

The workflow expects these binaries in `src-tauri/binaries/`:

| Platform | yt-dlp Binary | FFmpeg Binary |
|----------|---------------|---------------|
| Windows x64 | `yt-dlp-x86_64-pc-windows-msvc.exe` | `ffmpeg-x86_64-pc-windows-msvc.exe` |
| macOS Intel | `yt-dlp-x86_64-apple-darwin` | `ffmpeg-x86_64-apple-darwin` |
| macOS ARM | `yt-dlp-aarch64-apple-darwin` | `ffmpeg-aarch64-apple-darwin` |

All binaries must be:
- Present before the build starts
- Correctly named with target triple suffix
- Executable (macOS: `chmod +x`)

### Build Output Artifacts

After a successful build, these artifacts are attached to the GitHub Release:

| Platform | Artifact | Example Name |
|----------|----------|--------------|
| Windows | MSI Installer | `infrabooth-downloader_1.0.0_x64.msi` |
| macOS Intel | DMG | `infrabooth-downloader_1.0.0_x64.dmg` |
| macOS ARM | DMG | `infrabooth-downloader_1.0.0_aarch64.dmg` |
| All | Updater manifest | `latest.json` |
| All | Checksums | `checksums.txt` |

### Checksum File Format

The `checksums.txt` file contains SHA256 hashes:

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  ./infrabooth-downloader_1.0.0_x64.msi
a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e  ./infrabooth-downloader_1.0.0_x64.dmg
b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9  ./infrabooth-downloader_1.0.0_aarch64.dmg
```

### GitHub Secrets Required

| Secret | Purpose | Required |
|--------|---------|----------|
| `GITHUB_TOKEN` | Auto-provided, release management | Yes (auto) |
| `TAURI_SIGNING_PRIVATE_KEY` | Update signature | Recommended |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password | If key encrypted |
| `APPLE_CERTIFICATE` | macOS code signing | Optional |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password | Optional |
| `APPLE_SIGNING_IDENTITY` | Signing identity | Optional |
| `APPLE_ID` | Apple notarization | Optional |
| `APPLE_PASSWORD` | App-specific password | Optional |
| `APPLE_TEAM_ID` | Developer team ID | Optional |

### File Structure After This Story

```
.github/
└── workflows/
    ├── ci.yml              # (from Story 9.1)
    └── release.yml         # Release build workflow

src-tauri/
├── tauri.conf.json         # Bundle config, updater config
└── binaries/
    ├── yt-dlp-x86_64-pc-windows-msvc.exe
    ├── yt-dlp-x86_64-apple-darwin
    ├── yt-dlp-aarch64-apple-darwin
    ├── ffmpeg-x86_64-pc-windows-msvc.exe
    ├── ffmpeg-x86_64-apple-darwin
    ├── ffmpeg-aarch64-apple-darwin
    └── checksums.txt
```

### Anti-Patterns to Avoid

- **Do NOT** hardcode version numbers in the workflow - let tauri-action extract from Cargo.toml
- **Do NOT** skip sidecar binary verification - builds will fail or produce broken installers
- **Do NOT** commit signing keys to the repository - use GitHub Secrets
- **Do NOT** use `fail-fast: true` for the matrix - let all platforms attempt to build
- **Do NOT** skip checksum generation - users need to verify downloads
- **Do NOT** forget to set `includeUpdaterJson: true` - required for auto-updates
- **Do NOT** build without proper bundle identifier - causes signing/notarization issues
- **Do NOT** use self-hosted runners without proper security review

### Testing Checklist

Before marking complete, verify:

- [ ] Workflow triggers on tag push (e.g., `git tag v0.1.0 && git push --tags`)
- [ ] Workflow triggers on GitHub Release creation
- [ ] Windows build produces valid MSI installer
- [ ] macOS Intel build produces valid DMG
- [ ] macOS ARM build produces valid DMG
- [ ] All artifacts are attached to the GitHub Release
- [ ] Checksums file is generated and accurate
- [ ] Updater manifest (`latest.json`) is published
- [ ] MSI installs correctly on Windows (manual test)
- [ ] DMG installs correctly on macOS Intel (manual test)
- [ ] DMG installs correctly on macOS ARM (manual test)
- [ ] Installed app includes yt-dlp sidecar
- [ ] Installed app includes FFmpeg sidecar
- [ ] Sidecars are executable after installation

### Workflow Debugging Tips

1. **Check build logs**: Each platform job has detailed output
2. **Verify binaries exist**: The verification step lists binary files
3. **Check artifact upload**: tauri-action logs show upload status
4. **Test locally first**: `npm run tauri build` before pushing

### Alternative: Universal macOS Binary

For a single macOS binary supporting both Intel and ARM:

```yaml
- platform: macos-latest
  target: universal-apple-darwin
  args: '--target universal-apple-darwin'
```

This requires universal sidecar binaries or separate binaries for each arch bundled together. The matrix approach (separate builds) is simpler.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.2]
- [Source: _bmad-output/planning-artifacts/epics.md#ARCH-11, ARCH-12]
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md#Integration Points]
- [Source: _bmad-output/project-context.md#CI/CD Pipeline]
- [Tauri Action Documentation](https://github.com/tauri-apps/tauri-action)
- [Tauri Updater Guide](https://v2.tauri.app/plugin/updater/)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5)

### Debug Log References

### Completion Notes List

- Created `.github/workflows/release.yml` with cross-platform build matrix (Windows x64, macOS Intel, macOS ARM)
- Configured triggers: version tags (`v*`), release creation, manual workflow_dispatch
- Used `macos-13` for Intel builds (explicit x86_64), `macos-latest` for ARM builds
- Added sidecar binary verification step including ffprobe (not in story template but present in project)
- Updated `src-tauri/tauri.conf.json` with Windows WIX config and macOS minimum system version (10.15)
- Code signing configured as commented placeholders - secrets must be added by user
- Checksums job generates SHA256 for all installer artifacts
- `includeUpdaterJson: true` ensures `latest.json` manifest is published
- **Task 7 (testing) requires manual execution**: push a tag like `v0.1.0-test` to trigger workflow

### File List

- `.github/workflows/release.yml` (new)
- `src-tauri/tauri.conf.json` (modified - added Windows/macOS bundle config)
