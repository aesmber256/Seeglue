#!/usr/bin/env bash

# Get dist folder
DIST_DIR="$(dirname "${BASH_SOURCE[0]}")/.."

# Path to bundled Deno
DENO_EXE="$(realpath "$DIST_DIR/deno/deno")"

# Path to main.ts
MAIN_TS="$(realpath "$DIST_DIR/../main.ts")"

# Call local Deno binary and forward all arguments
"$DENO_EXE" run --unstable-raw-imports --allow-read --allow-run --allow-write "$MAIN_TS" "$@"