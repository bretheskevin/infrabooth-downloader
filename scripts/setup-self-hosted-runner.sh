#!/bin/bash
# Self-Hosted GitHub Actions Runner Setup Script
# This script sets up a self-hosted runner for your repository
#
# Usage: ./scripts/setup-self-hosted-runner.sh

set -e

# Configuration
REPO="bretheskevin/infrabooth-downloader"
RUNNER_DIR="$HOME/actions-runner"
RUNNER_VERSION="2.321.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GitHub Actions Self-Hosted Runner Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  darwin)
    case "$ARCH" in
      arm64) RUNNER_ARCH="osx-arm64" ;;
      x86_64) RUNNER_ARCH="osx-x64" ;;
      *) echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
    esac
    ;;
  linux)
    case "$ARCH" in
      x86_64) RUNNER_ARCH="linux-x64" ;;
      aarch64) RUNNER_ARCH="linux-arm64" ;;
      *) echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
    esac
    ;;
  *)
    echo -e "${RED}Unsupported OS: $OS${NC}"
    exit 1
    ;;
esac

echo -e "Detected: ${GREEN}$OS ($ARCH)${NC} -> Runner: ${GREEN}$RUNNER_ARCH${NC}"
echo ""

# Step 1: Get registration token
echo -e "${YELLOW}Step 1: Getting registration token...${NC}"
echo "This requires the 'gh' CLI to be authenticated."
echo ""

TOKEN=$(gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/actions/runners/registration-token" \
  --jq '.token')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get registration token. Make sure you have admin access to the repo.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Got registration token${NC}"
echo ""

# Step 2: Create runner directory
echo -e "${YELLOW}Step 2: Setting up runner directory...${NC}"

if [ -d "$RUNNER_DIR" ]; then
  echo -e "${YELLOW}Runner directory already exists at $RUNNER_DIR${NC}"
  read -p "Remove and recreate? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$RUNNER_DIR"
  else
    echo "Using existing directory..."
  fi
fi

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

echo -e "${GREEN}✓ Created $RUNNER_DIR${NC}"
echo ""

# Step 3: Download runner
echo -e "${YELLOW}Step 3: Downloading runner...${NC}"

RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"

if [ ! -f "run.sh" ]; then
  echo "Downloading from: $RUNNER_URL"
  curl -o actions-runner.tar.gz -L "$RUNNER_URL"
  tar xzf ./actions-runner.tar.gz
  rm actions-runner.tar.gz
  echo -e "${GREEN}✓ Downloaded and extracted runner${NC}"
else
  echo -e "${GREEN}✓ Runner already downloaded${NC}"
fi
echo ""

# Step 4: Configure runner
echo -e "${YELLOW}Step 4: Configuring runner...${NC}"
echo ""

./config.sh --url "https://github.com/${REPO}" --token "$TOKEN" --name "$(hostname)-runner" --labels "self-hosted,$OS,$ARCH" --unattended --replace

echo ""
echo -e "${GREEN}✓ Runner configured${NC}"
echo ""

# Step 5: Setup as service (optional)
echo -e "${YELLOW}Step 5: Service setup${NC}"
echo ""

if [ "$OS" = "darwin" ]; then
  echo "To run the runner:"
  echo ""
  echo -e "  ${GREEN}cd $RUNNER_DIR && ./run.sh${NC}"
  echo ""
  echo "To install as a service (runs on startup):"
  echo ""
  echo -e "  ${GREEN}cd $RUNNER_DIR && ./svc.sh install && ./svc.sh start${NC}"
  echo ""
elif [ "$OS" = "linux" ]; then
  echo "To run the runner:"
  echo ""
  echo -e "  ${GREEN}cd $RUNNER_DIR && ./run.sh${NC}"
  echo ""
  echo "To install as a systemd service:"
  echo ""
  echo -e "  ${GREEN}cd $RUNNER_DIR && sudo ./svc.sh install && sudo ./svc.sh start${NC}"
  echo ""
fi

# Step 6: Update workflow to use self-hosted runner
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "1. Start the runner:"
echo -e "   ${GREEN}cd $RUNNER_DIR && ./run.sh${NC}"
echo ""
echo "2. Update your workflow to use 'runs-on: self-hosted' for the release job"
echo "   (I can do this for you automatically)"
echo ""
echo "3. Re-run the failed workflow"
echo ""

# Ask if user wants to start runner now
read -p "Start the runner now? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  echo ""
  echo -e "${GREEN}Starting runner... (Press Ctrl+C to stop)${NC}"
  echo ""
  ./run.sh
fi
