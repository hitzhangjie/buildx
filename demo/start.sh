#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

# Clean previous data and ensure a clean slate for bootstrap.
#rm -rf "$DATA_DIR"

export BUILDX_DATA_DIR="$DATA_DIR"
export BUILDX_HTTP_ADDR=0.0.0.0:9910
export BUILDX_SSH_ADDR=0.0.0.0:9911

export BUILDX_INITIAL_USER=zhangjie
export BUILDX_INITIAL_PASSWORD=zhangjie
export BUILDX_INITIAL_EMAIL=hit.zhangjie@gmail.com

export BUILDX_HOTRELOAD=1

BINARY="$REPO_ROOT/buildx-server/bin/buildx-server"
if [ ! -x "$BINARY" ]; then
  echo "ERROR: $BINARY not found or not executable. Run 'make build' first." >&2
  exit 1
fi

exec "$BINARY" serve --dev
