#!/usr/bin/env bash
# Regenerates public/og-image.png from scripts/assets/og-image.html using headless Chrome.
# Set CHROME to override the browser binary.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot="$PWD/public/og-image.png" "file://$PWD/scripts/assets/og-image.html" 2>/dev/null
echo "==> Wrote public/og-image.png"
