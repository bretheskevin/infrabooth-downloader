#!/bin/bash
# Runs inside Docker container to build Windows version
set -e

cd /app

echo "Installing npm dependencies..."
npm ci

echo "Building Windows target with cargo-xwin..."
cd src-tauri

# Build the Rust binary for Windows
cargo xwin build --release --target x86_64-pc-windows-msvc

echo "Windows binary built successfully!"

# Note: Full Tauri bundling (NSIS/MSI) requires Windows
# The binary can be distributed directly or bundled manually
ls -la target/x86_64-pc-windows-msvc/release/*.exe 2>/dev/null || echo "No .exe found in release"
