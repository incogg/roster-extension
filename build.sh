#!/usr/bin/env bash
# Builds the extension (Vite → dist/) and packs dist/ into a release zip.
# dist/ is a complete, loadable extension: the Vue app bundled to dist/roster.js
# plus the copied content/background/injected scripts, page CSS, manifest, icons.
set -euo pipefail

cd "$(dirname "$0")"

# Build the Vue app + copy static files into dist/.
npm run build

# Pull the version out of manifest.json (no jq dependency).
VERSION=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' manifest.json \
    | head -n1 | grep -oE '[0-9]+(\.[0-9]+)*')

if [[ -z "$VERSION" ]]; then
    echo "error: could not read version from manifest.json" >&2
    exit 1
fi

OUT_DIR=web-ext-artifacts
OUT="$OUT_DIR/roster_extension-$VERSION.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT"

# Zip the *contents* of dist/ (so manifest.json sits at the zip root).
( cd dist && zip -r -FS "../$OUT" . -x '*.DS_Store' >/dev/null )

echo "built $OUT"
