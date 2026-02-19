#!/bin/bash
# Local Release Build Script
# Builds all platforms locally without any CI/CD
#
# Usage: ./scripts/build-release.sh [version]
# Example: ./scripts/build-release.sh 0.1.0

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load .env file if it exists (check both root and src-tauri)
if [ -f ".env" ]; then
    echo -e "${YELLOW}Loading environment from .env...${NC}"
    set -a
    source .env
    set +a
elif [ -f "src-tauri/.env" ]; then
    echo -e "${YELLOW}Loading environment from src-tauri/.env...${NC}"
    set -a
    source src-tauri/.env
    set +a
fi

# Verify signing keys are set
if [ -z "$TAURI_SIGNING_PRIVATE_KEY" ]; then
    echo -e "${RED}Warning: TAURI_SIGNING_PRIVATE_KEY not set. Updater signatures will fail.${NC}"
    echo -e "${YELLOW}Add it to src-tauri/.env (see src-tauri/.env.example)${NC}"
fi

VERSION="${1:-$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/.*"\(.*\)".*/\1/')}"
RELEASE_DIR="release-builds/v${VERSION}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building InfraBooth Downloader v${VERSION}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Create release directory
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v rustup &> /dev/null; then
    echo -e "${RED}rustup not found. Please install Rust.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install Node.js.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Windows builds will be skipped.${NC}"
    SKIP_WINDOWS=true
fi

# Setup Rust targets
echo -e "${YELLOW}Setting up Rust targets...${NC}"
rustup target add aarch64-apple-darwin 2>/dev/null || true
rustup target add x86_64-apple-darwin 2>/dev/null || true

# Install npm dependencies
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm ci

# Check for create-dmg
if ! command -v create-dmg &> /dev/null; then
    echo -e "${YELLOW}Installing create-dmg...${NC}"
    brew install create-dmg
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building macOS ARM (aarch64)${NC}"
echo -e "${GREEN}========================================${NC}"
npm run tauri build -- --target aarch64-apple-darwin

cp src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg "$RELEASE_DIR/" 2>/dev/null || true
cp src-tauri/target/aarch64-apple-darwin/release/bundle/macos/*.app.tar.gz "$RELEASE_DIR/" 2>/dev/null || true
cp src-tauri/target/aarch64-apple-darwin/release/bundle/macos/*.app.tar.gz.sig "$RELEASE_DIR/" 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building macOS Intel (x86_64)${NC}"
echo -e "${GREEN}========================================${NC}"
npm run tauri build -- --target x86_64-apple-darwin

cp src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*.dmg "$RELEASE_DIR/" 2>/dev/null || true
cp src-tauri/target/x86_64-apple-darwin/release/bundle/macos/*.app.tar.gz "$RELEASE_DIR/" 2>/dev/null || true
cp src-tauri/target/x86_64-apple-darwin/release/bundle/macos/*.app.tar.gz.sig "$RELEASE_DIR/" 2>/dev/null || true

# Windows build via Docker
if [ "$SKIP_WINDOWS" != "true" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Building Windows (x86_64) via Docker${NC}"
    echo -e "${GREEN}========================================${NC}"

    # Build Docker image if needed
    if ! docker images | grep -q "tauri-windows-builder"; then
        echo -e "${YELLOW}Building Docker image for Windows cross-compilation...${NC}"
        docker build -t tauri-windows-builder -f scripts/Dockerfile.windows .
    fi

    # Run Windows build in Docker
    docker run --rm \
        -v "$(pwd):/app" \
        -v "$HOME/.cargo/registry:/root/.cargo/registry" \
        -e TAURI_SIGNING_PRIVATE_KEY="${TAURI_SIGNING_PRIVATE_KEY:-}" \
        -e TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" \
        tauri-windows-builder

    # Copy Windows artifacts
    cp src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe "$RELEASE_DIR/" 2>/dev/null || true
    cp src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe.sig "$RELEASE_DIR/" 2>/dev/null || true
    cp src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi "$RELEASE_DIR/" 2>/dev/null || true
    cp src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi.sig "$RELEASE_DIR/" 2>/dev/null || true
fi

# Generate checksums
echo ""
echo -e "${YELLOW}Generating checksums...${NC}"
cd "$RELEASE_DIR"
shasum -a 256 * > checksums.txt 2>/dev/null || sha256sum * > checksums.txt
cat checksums.txt
cd - > /dev/null

# Generate latest.json for updater
echo ""
echo -e "${YELLOW}Generating latest.json...${NC}"

cd "$RELEASE_DIR"
ARM_TAR=$(ls *aarch64*.app.tar.gz 2>/dev/null | head -1 || echo "")
INTEL_TAR=$(ls *x64*.app.tar.gz 2>/dev/null | head -1 || echo "")
WINDOWS_EXE=$(ls *setup*.exe 2>/dev/null | head -1 || echo "")

ARM_SIG=$(cat "${ARM_TAR}.sig" 2>/dev/null || echo "")
INTEL_SIG=$(cat "${INTEL_TAR}.sig" 2>/dev/null || echo "")
WINDOWS_SIG=$(cat "${WINDOWS_EXE}.sig" 2>/dev/null || echo "")

cat > latest.json << EOF
{
  "version": "${VERSION}",
  "notes": "See release notes for details.",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "darwin-aarch64": {
      "signature": "${ARM_SIG}",
      "url": "https://github.com/bretheskevin/infrabooth-downloader/releases/download/v${VERSION}/$(echo $ARM_TAR | sed 's/ /%20/g')"
    },
    "darwin-x86_64": {
      "signature": "${INTEL_SIG}",
      "url": "https://github.com/bretheskevin/infrabooth-downloader/releases/download/v${VERSION}/$(echo $INTEL_TAR | sed 's/ /%20/g')"
    },
    "windows-x86_64": {
      "signature": "${WINDOWS_SIG}",
      "url": "https://github.com/bretheskevin/infrabooth-downloader/releases/download/v${VERSION}/$(echo $WINDOWS_EXE | sed 's/ /%20/g')"
    }
  }
}
EOF
cd - > /dev/null

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Release files are in: $RELEASE_DIR"
echo ""
ls -la "$RELEASE_DIR"
echo ""
echo -e "${YELLOW}To create a GitHub release:${NC}"
echo "  gh release create v${VERSION} --draft --title \"InfraBooth Downloader v${VERSION}\" ${RELEASE_DIR}/*"
