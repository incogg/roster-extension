#!/usr/bin/env bash
# Packs the extension into a release zip under web-ext-artifacts/.
# Usage: ./build.sh
set -euo pipefail

cd "$(dirname "$0")"

# Files/dirs that make up the shippable extension.
FILES=(manifest.json content.js background.js injected.js styles.css icons)

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

zip -r -FS "$OUT" "${FILES[@]}" -x '*.DS_Store' >/dev/null

echo "built $OUT"
