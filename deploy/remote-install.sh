#!/bin/bash
# Remote install / restart for Happy Star.
# Invoked by deploy/deploy.ps1 over SSH.
#
# Args:
#   $1 — RemoteDir (e.g. /home/wh/apps/happy-star) — code lives here
#   $2 — DataDir   (e.g. /home/wh/apps/happy-star/data) — preserved across deploys
#   $3 — Port      (e.g. 8080)
#
# Data safety contract:
#   1. Before anything, snapshot DataDir to STAGE_DIR/hs-data-backup.<timestamp>
#      (keeps the newest 3). This is a hard safety net.
#   2. Build the new code in a sibling .new dir FIRST — this never touches data.
#   3. ONLY right before the atomic code swap, if DataDir lives inside RemoteDir,
#      move it out to STAGE_DIR; move it back immediately after the swap.
#   4. A trap restores the moved-out data on ANY early exit, so a failed
#      install/build can never leave data orphaned.
#   The script NEVER deletes the data dir.

set -euo pipefail

REMOTE_DIR="${1:?usage: remote-install.sh <remote-dir> <data-dir> <port>}"
DATA_DIR="${2:?usage: remote-install.sh <remote-dir> <data-dir> <port>}"
PORT="${3:-8080}"

TAR_FILE="$(ls -1t /tmp/hs-deploy-*.tar.gz 2>/dev/null | head -1 || true)"
if [ -z "$TAR_FILE" ]; then
  echo "ERROR: no /tmp/hs-deploy-*.tar.gz found" >&2
  exit 1
fi
echo "Using tar: $TAR_FILE"

NORM_REMOTE_DIR="$(cd "$REMOTE_DIR" 2>/dev/null && pwd || echo "$REMOTE_DIR")"
NORM_DATA_DIR="$(cd "$DATA_DIR" 2>/dev/null && pwd || echo "$DATA_DIR")"
if [ "$NORM_DATA_DIR" = "$NORM_REMOTE_DIR" ]; then
  echo "ERROR: data dir == remote dir; refusing to potentially clobber data" >&2
  echo "       remote: $NORM_REMOTE_DIR" >&2
  echo "       data:   $NORM_DATA_DIR" >&2
  exit 1
fi

NEW_DIR="${REMOTE_DIR}.new"
STAGE_DIR="$(dirname "$REMOTE_DIR")"

# ---- 1) Pre-deploy snapshot (hard safety net), keep newest 3 ----
if [ -d "$DATA_DIR" ]; then
  SNAP="${STAGE_DIR}/hs-data-backup.$(date +%Y%m%d-%H%M%S)"
  cp -a "$DATA_DIR" "$SNAP"
  echo "Data snapshot: $SNAP"
  OLD_SNAPS="$(ls -1dt "${STAGE_DIR}"/hs-data-backup.* 2>/dev/null || true)"
  echo "$OLD_SNAPS" | tail -n +4 | xargs -r rm -rf || true
fi

# ---- 2) Build the new code FIRST (does not touch data) ----
rm -rf "$NEW_DIR"
mkdir -p "$NEW_DIR"
tar -xzf "$TAR_FILE" -C "$NEW_DIR"
cd "$NEW_DIR"
echo "==> npm install:all"
npm run install:all --silent 2>&1 | tail -5
echo "==> npm run build"
npm run build 2>&1 | tail -5
cd "$STAGE_DIR"

# ---- 3) Trap: if we move data out and fail before moving it back, restore it ----
STAGED_DATA_DIR=""
restore_staged() {
  if [ -n "${STAGED_DATA_DIR:-}" ] && [ -d "$STAGED_DATA_DIR" ]; then
    echo "TRAP: restoring staged data $STAGED_DATA_DIR -> $DATA_DIR" >&2
    mkdir -p "$(dirname "$DATA_DIR")"
    mv "$STAGED_DATA_DIR" "$DATA_DIR" 2>/dev/null || true
  fi
}
trap restore_staged EXIT

# Move data out only if it lives inside the code dir, and only now (just before swap).
case "$NORM_DATA_DIR" in
  "$NORM_REMOTE_DIR"/*)
    if [ -d "$DATA_DIR" ]; then
      STAGED_DATA_DIR="${STAGE_DIR}/hs-data-staged.$$"
      echo "Data dir is inside code dir; moving to $STAGED_DATA_DIR before swap"
      mv "$DATA_DIR" "$STAGED_DATA_DIR"
    fi
    ;;
esac

# ---- 4) Atomic code swap (data already moved out, so .bak removal is safe) ----
BACKUP_DIR="${REMOTE_DIR}.bak.$$"
if [ -d "$REMOTE_DIR" ]; then
  mv "$REMOTE_DIR" "$BACKUP_DIR"
fi
mv "$NEW_DIR" "$REMOTE_DIR"
rm -rf "$BACKUP_DIR"

# ---- 5) Move data back, then disarm the trap ----
if [ -n "${STAGED_DATA_DIR:-}" ] && [ -d "$STAGED_DATA_DIR" ]; then
  mkdir -p "$(dirname "$DATA_DIR")"
  echo "Restoring data dir: $STAGED_DATA_DIR -> $DATA_DIR"
  mv "$STAGED_DATA_DIR" "$DATA_DIR"
fi
STAGED_DATA_DIR=""
trap - EXIT

mkdir -p "$DATA_DIR"

# ---- 6) Restart: prefer systemd if a matching unit + passwordless sudo exist; else nohup ----
cd "$REMOTE_DIR"
restarted=""
if command -v systemctl >/dev/null 2>&1 \
   && systemctl cat happy-star.service >/dev/null 2>&1; then
  echo "Restarting via systemd (happy-star.service)"
  if sudo -n systemctl restart happy-star; then restarted="systemd"; fi
fi
if [ -z "$restarted" ]; then
  echo "Restarting via nohup (no systemd unit / no passwordless sudo)"
  pkill -f 'server/src/index.js' 2>/dev/null || true
  sleep 1
  HAPPY_STAR_DATA="$DATA_DIR" \
  PORT="$PORT" \
  nohup node server/src/index.js > "$REMOTE_DIR/server.log" 2>&1 &
  NEW_PID=$!
  disown 2>/dev/null || true
  restarted="nohup PID=$NEW_PID"
fi
echo "Restarted via $restarted (data=$DATA_DIR, port=$PORT)"

# ---- 7) Verify it answers HTTP (401 on /api/me is healthy: server is up) ----
sleep 2
if curl -sS -o /dev/null "http://127.0.0.1:${PORT}/api/me" 2>/dev/null; then
  echo "Server responding on port $PORT."
else
  echo "WARNING: server not responding on port $PORT yet." >&2
  [ -f "$REMOTE_DIR/server.log" ] && { echo "--- server.log tail ---" >&2; tail -20 "$REMOTE_DIR/server.log" >&2; }
fi

rm -f "$TAR_FILE"
echo "Done."
