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

mkdir -p "$PUBLIC/onedev/css" "$PUBLIC/~icon" "$PUBLIC/~img"

cp "$ONEDEV_WEB/asset/bootstrap/css/bootstrap.min.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/asset/bootstrap/css/bootstrap-custom.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/base/base.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/layout/layout.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/simple/simple.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/editable/editable.css" "$PUBLIC/onedev/css/"
# Project blob page CSS — essential for file browser layout and empty-project guidance
cp "$ONEDEV_WEB/page/project/blob/project-blob.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/project/blob/navigator/blob-navigator.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/project/blob/render/folder/folder-view.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/project/blob/render/nocommits/no-commits.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/page/project/blob/render/source/source-view.css" "$PUBLIC/onedev/css/"
cp "$ONEDEV_WEB/asset/selectionpopover/jquery.selectionpopover.css" "$PUBLIC/onedev/css/selection-popover.css"
SELECT2_RES="$ONEDEV_WEB/component/select2/res"
cp "$SELECT2_RES/select2.css" "$SELECT2_RES/select2-bootstrap.css" "$PUBLIC/onedev/css/"
cp "$SELECT2_RES/select2.png" "$SELECT2_RES/select2x2.png" "$SELECT2_RES/select2-spinner.gif" "$SELECT2_RES/dark-select2-spinner.gif" "$PUBLIC/onedev/css/" 2>/dev/null || true
cp "$ONEDEV_WEB/asset/icon/"*.svg "$PUBLIC/~icon/"
cp "$ONEDEV_WEB/img/mesh.jpg" "$PUBLIC/~img/"
cp "$ONEDEV_WEB/img/dark-mesh.jpg" "$PUBLIC/~img/"

if [[ -f "$ROOT/references/onedev/server-product/system/site/assets/logo.png" ]]; then
  mkdir -p "$PUBLIC/~img"
  cp "$ROOT/references/onedev/server-product/system/site/assets/logo.png" "$PUBLIC/~img/logo.png" 2>/dev/null || true
fi

echo "synced OneDev assets -> $PUBLIC"
