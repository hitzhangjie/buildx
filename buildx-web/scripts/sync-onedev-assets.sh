#!/usr/bin/env bash
# Copy OneDev UI assets from references/ (read-only) into buildx-web/public.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ONEDEV_WEB="$ROOT/references/onedev/server-core/src/main/java/io/onedev/server/web"
PUBLIC="$ROOT/buildx-web/public"

if [[ ! -d "$ONEDEV_WEB" ]]; then
  echo "OneDev reference not found. Run: git submodule update --init references/onedev" >&2
  exit 1
fi

mkdir -p "$PUBLIC/onedev/css" "$PUBLIC/~icon"

cp "$ONEDEV_WEB/asset/bootstrap/css/bootstrap.min.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/asset/bootstrap/css/bootstrap-custom.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/base/base.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/layout/layout.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/asset/icon/"*.svg "$PUBLIC/~icon/"

if [[ -f "$ROOT/references/onedev/server-product/system/site/assets/logo.png" ]]; then
  mkdir -p "$PUBLIC/~img"
  cp "$ROOT/references/onedev/server-product/system/site/assets/logo.png" "$PUBLIC/~img/logo.png" 2>/dev/null || true
fi

echo "synced OneDev assets -> $PUBLIC"
