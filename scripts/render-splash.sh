#!/usr/bin/env bash
# Renders scripts/splash.html to public/splash/<w>x<h>@<dpr>.png for every
# iPhone screen size (portrait), with headless Microsoft Edge or Chrome.
# The sizes must match SPLASH_SCREENS in src/lib/splash-screens.ts.
#
#   BROWSER="/path/to/chrome" scripts/render-splash.sh
set -euo pipefail

cd "$(dirname "$0")/.."
BROWSER="${BROWSER:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
ROOT="$(pwd -W 2>/dev/null || pwd)"
OUT="$ROOT/public/splash"
mkdir -p "$OUT"
PAGE="file:///$ROOT/scripts/splash.html"

# CSS width x height @ device pixel ratio
SIZES="440x956@3 420x912@3 402x874@3 430x932@3 393x852@3 428x926@3 390x844@3 414x896@3 375x812@3 414x896@2 375x667@2"

for size in $SIZES; do
  css="${size%@*}"; dpr="${size#*@}"
  w="${css%x*}"; h="${css#*x}"
  # twice: the first run may draw before the web font arrives
  for _ in 1 2; do
    "$BROWSER" --headless=new --disable-gpu --hide-scrollbars \
      --force-device-scale-factor="$dpr" --window-size="$w,$h" \
      --virtual-time-budget=10000 --screenshot="$OUT/$size.png" "$PAGE#${w}x${h}" >/dev/null 2>&1
  done
  echo "$OUT/$size.png"
done
