#!/usr/bin/env bash
# Sync buildx-web/dist into buildx-server embed directory.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB_DIST="$ROOT/buildx-web/dist"
EMBED_DIR="$ROOT/buildx-server/internal/server/webdist"

if [[ ! -d "$WEB_DIST" ]]; then
  echo "buildx-web/dist not found; run: make -C buildx-web build" >&2
  exit 1
fi

rm -rf "$EMBED_DIR"
mkdir -p "$EMBED_DIR"
cp -a "$WEB_DIST/." "$EMBED_DIR/"
echo "synced $WEB_DIST -> $EMBED_DIR"
