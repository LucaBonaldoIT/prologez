#!/usr/bin/env bash
# Regenerates dist/ from scratch: installs dependencies if missing, verifies the lessons
# against SWI-Prolog, then runs a clean production build.
#   ./build.sh            full build (install if needed, verify, build)
#   ./build.sh --fast     skip the lesson verification
set -euo pipefail
cd "$(dirname "$0")"

fast=0
[ "${1:-}" = "--fast" ] && fast=1

if [ ! -d node_modules ]; then
  echo "==> Installing dependencies"
  npm ci
fi

if [ "$fast" -eq 0 ]; then
  echo "==> Verifying lessons"
  npm run --silent verify
fi

echo "==> Building"
rm -rf dist
npm run --silent build

echo "==> Done: $(du -sh dist | cut -f1) in dist/"
