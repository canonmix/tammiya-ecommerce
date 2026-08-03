#!/bin/sh
# Cron entry point for releasing stock held by unpaid orders.
#
# Install (every 5 minutes):
#   crontab -e
#   */5 * * * * APP_URL=https://your-shop.example CRON_SECRET=xxxx /path/to/scripts/release-expired-orders.sh >> /var/log/tamiya-cron.log 2>&1
#
# Reads APP_URL and CRON_SECRET from the environment, or from .env.local next to the project
# when run without them (handy for local testing).
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if [ -z "${CRON_SECRET:-}" ] && [ -f "$DIR/.env.local" ]; then
  CRON_SECRET=$(grep -E '^CRON_SECRET=' "$DIR/.env.local" | head -1 | cut -d'"' -f2)
fi
APP_URL=${APP_URL:-http://localhost:3000}

if [ -z "${CRON_SECRET:-}" ]; then
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') release-expired: CRON_SECRET is not set" >&2
  exit 1
fi

RESPONSE=$(curl -sS --max-time 60 -X POST "$APP_URL/api/cron/release-expired" -H "Authorization: Bearer $CRON_SECRET")
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') release-expired: $RESPONSE"

# Make a failed run visible to cron (non-zero exit triggers the usual cron mail/alerting).
case "$RESPONSE" in
  *'"ok":true'*) exit 0 ;;
  *) exit 1 ;;
esac
