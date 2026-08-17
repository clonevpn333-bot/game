#!/usr/bin/env bash
# Concatenate the GHOSTLINE source modules into the single-file distributable.
# Usage: bash src/cp2077/build.sh  (from the repository root)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$DIR/../../cyberpunk2077.html}"

PARTS=(
  00_head.html
  01_dom.html
  10_core.js
  20_gl.js
  30_tex.js
  35_audio.js
  40_shaders.js
  50_geo.js
  60_city.js
  62_world.js
  70_char.js
  80_vehicle.js
  82_weapon.js
  90_render.js
  A0_npc.js
  A2_life.js
  B0_story.js
  C0_ui.js
  D0_game.js
)

: > "$OUT"
for p in "${PARTS[@]}"; do
  cat "$DIR/$p" >> "$OUT"
  printf '\n' >> "$OUT"
done

BYTES=$(wc -c < "$OUT")
LINES=$(wc -l < "$OUT")
printf 'built %s\n  %s lines, %s bytes (%.1f KB)\n' "$OUT" "$LINES" "$BYTES" "$(echo "$BYTES/1024" | bc -l)"
