#!/usr/bin/env bash
# Deploy script for the ZPoker API workspace on the VPS.
# Run as the `deploy` user from /var/www/zpoker.
# Usage: ./deploy.sh
#
# Steps:
#   1. Pull latest code from origin/master
#   2. yarn install at root (yarn workspaces hoist deps)
#   3. Run TypeORM migrations against Neon (api workspace)
#   4. Build the api workspace (nest build)
#   5. Reload PM2 with --update-env (zero-downtime, picks up new .env)
#   6. Health-check the local app port; rollback to previous commit on failure
set -euo pipefail

# --- config ---
APP_DIR="/var/www/zpoker"
API_DIR="$APP_DIR/apps/api"
APP_NAME="zpoker-backend"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3031/health}"
HEALTH_TIMEOUT_SECS="${HEALTH_TIMEOUT_SECS:-30}"

log() { printf '\n[deploy] %s\n' "$*"; }
fail() { printf '\n[deploy][ERROR] %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR" || fail "cannot cd to $APP_DIR"

# --- preflight ---
[[ -f "$API_DIR/.env" ]] || fail "$API_DIR/.env missing — populate it before deploying"
command -v yarn >/dev/null || fail "yarn not found in PATH"
command -v pm2 >/dev/null || fail "pm2 not found in PATH"

# --- 1. Capture current commit for rollback ---
PREVIOUS_COMMIT=$(git rev-parse HEAD)
log "current commit: $PREVIOUS_COMMIT"

# --- 2. Pull latest ---
log "fetching origin/$DEPLOY_BRANCH"
git fetch --quiet origin "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"
NEW_COMMIT=$(git rev-parse HEAD)
log "new commit: $NEW_COMMIT"

# --- 3. Install dependencies (yarn v1 workspaces hoist to root) ---
log "yarn install --frozen-lockfile"
yarn install --frozen-lockfile

# --- 4. Migrations: TypeORM via the api workspace ---
# data-source.ts uses DATABASE_URL from apps/api/.env (Neon pooled). Pooled
# connections work for migrations too on Neon, just slower under load — fine
# for occasional schema changes. If a separate direct URL is preferred, set
# DATABASE_URL_DIRECT in .env and override here.
log "running migrations (yarn workspace api migration:run)"
yarn workspace api migration:run

# --- 5. Build api ---
log "building api"
yarn workspace api build

# --- 6. Reload PM2 ---
log "reloading pm2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

# --- 7. Health check + rollback ---
log "health check ($HEALTH_URL, up to ${HEALTH_TIMEOUT_SECS}s)"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECS ))
healthy=0
while (( $(date +%s) < deadline )); do
  if curl -sSf -o /dev/null --max-time 3 "$HEALTH_URL"; then
    healthy=1
    break
  fi
  sleep 2
done

if (( healthy == 0 )); then
  log "health check FAILED — rolling back to $PREVIOUS_COMMIT"
  git reset --hard "$PREVIOUS_COMMIT"
  yarn install --frozen-lockfile
  yarn workspace api build
  pm2 reload "$APP_NAME" --update-env || pm2 start ecosystem.config.js
  fail "deploy aborted; rolled back"
fi

log "deploy successful: $PREVIOUS_COMMIT -> $NEW_COMMIT"
pm2 status
