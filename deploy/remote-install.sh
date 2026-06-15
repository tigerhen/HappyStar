#!/bin/bash
# Remote install / restart for Happy Star.
# Invoked by deploy/deploy.ps1 over SSH.
#
# Args:
#   $1 — RemoteDir (e.g. /home/wh/apps/happy-star) — code lives here
#   $2 — DataDir   (e.g. /home/wh/apps/happy-star/data OR /home/wh/apps/data) — preserved across deploys
#   $3 — Port      (e.g. 8080)
#
# Data safety contract:
#   - If DataDir is INSIDE RemoteDir, this script moves it OUT to the parent
#     (STAGE_DIR = dirname of RemoteDir) BEFORE swapping code, then moves it
#     back AFTER the new code is in place. This prevents the old
#     `rm -rf .bak` from wiping user data.
#   - If DataDir is ALREADY outside RemoteDir, no move is needed.
#   - In either case, the script NEVER deletes the data dir.

set -euo pipefail

REMOTE_DIR="${1:?usage: remote-install.sh <remote-dir> <data-dir> <port>}"
DATA_DIR="${2:?usage: remote-install.sh <remote-dir> <data-dir> <port>}"
PORT="${3:-8080}"

# Find the latest tar uploaded by deploy.ps1 (matches /tmp/hs-deploy-*.tar.gz).
TAR_FILE="$(ls -1t /tmp/hs-deploy-*.tar.gz 2>/dev/null | head -1 || true)"
if [ -z "$TAR_FILE" ]; then
  echo "ERROR: no /tmp/hs-deploy-*.tar.gz found" >&2
  exit 1
fi
echo "Using tar: $TAR_FILE"

# Sanity: data dir must not be the SAME path as the code dir.
NORM_REMOTE_DIR="$(cd "$REMOTE_DIR" 2>/dev/null && pwd || echo "$REMOTE_DIR")"
NORM_DATA_DIR="$(cd "$DATA_DIR" 2>/dev/null && pwd || echo "$DATA_DIR")"
if [ "$NORM_DATA_DIR" = "$NORM_REMOTE_DIR" ]; then
  echo "ERROR: data dir == remote dir; refusing to potentially clobber data" >&2
  echo "       remote: $NORM_REMOTE_DIR" >&2
  echo "       data:   $NORM_DATA_DIR" >&2
  exit 1
fi

# Stage new code in a sibling .new dir, swap atomically.
NEW_DIR="${REMOTE_DIR}.new"
STAGE_DIR="$(dirname "$REMOTE_DIR")"

# ---- DATA SAFETY: move data out if it's inside the code dir. ----
# After this block, DATA_DIR points to a path OUTSIDE RemoteDir (either it
# was already there, or we just moved it to STAGE_DIR/data.staged.$$).
DATA_MOVED_OUT=""
STAGED_DATA_DIR=""
case "$NORM_DATA_DIR" in
  "$NORM_REMOTE_DIR"/*)
    # Data is inside the code dir. Move it out BEFORE the code-dir swap.
    STAGED_DATA_DIR="${STAGE_DIR}/hs-data-staged.$$"
    if [ -d "$DATA_DIR" ]; then
      echo "Data dir is inside code dir; moving to $STAGED_DATA_DIR before swap"
      mv "$DATA_DIR" "$STAGED_DATA_DIR"
      DATA_MOVED_OUT="yes"
    fi
    # DATA_DIR is now logically under STAGE_DIR; we'll move it back after swap.
    ;;
esac

rm -rf "$NEW_DIR"
mkdir -p "$NEW_DIR"
tar -xzf "$TAR_FILE" -C "$NEW_DIR"

# Run install + build inside the staged new dir.
cd "$NEW_DIR"
echo "==> npm install:all"
npm run install:all --silent 2>&1 | tail -5
echo "==> npm run build"
npm run build 2>&1 | tail -5

# Atomic code swap: move current aside, move new into place, then delete the aside.
# This no longer touches the data dir because we moved it out first (or it was
# already outside).
BACKUP_DIR="${REMOTE_DIR}.bak.$$"
if [ -d "$REMOTE_DIR" ]; then
  mv "$REMOTE_DIR" "$BACKUP_DIR"
fi
mv "$NEW_DIR" "$REMOTE_DIR"
sleep 1
rm -rf "$BACKUP_DIR"

# ---- DATA SAFETY: move data back into place if we moved it out. ----
if [ -n "$DATA_MOVED_OUT" ] && [ -d "$STAGED_DATA_DIR" ]; then
  # The parent of DATA_DIR (REMOTE_DIR) now exists (it's the just-installed code).
  mkdir -p "$(dirname "$DATA_DIR")"
  echo "Restoring data dir: $STAGED_DATA_DIR -> $DATA_DIR"
  mv "$STAGED_DATA_DIR" "$DATA_DIR"
fi

# Restart server.
cd "$REMOTE_DIR"
pkill -f 'server/src/index.js' 2>/dev/null || true
sleep 1

mkdir -p "$DATA_DIR"
HAPPY_STAR_DATA="$DATA_DIR" \
PORT="$PORT" \
nohup node server/src/index.js > "$REMOTE_DIR/server.log" 2>&1 &
NEW_PID=$!
disown 2>/dev/null || true
echo "Started PID=$NEW_PID (data=$DATA_DIR, port=$PORT)"

# Wait briefly and verify it's listening.
sleep 2
if ! kill -0 "$NEW_PID" 2>/dev/null; then
  echo "ERROR: server PID $NEW_PID exited immediately. Tail of log:" >&2
  tail -20 "$REMOTE_DIR/server.log" >&2
  exit 1
fi
echo "Server up."
echo "--- server.log ---"
cat "$REMOTE_DIR/server.log"

# Cleanup tar.
rm -f "$TAR_FILE"
