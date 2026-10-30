#!/usr/bin/env bash
# Copies all data (customers, meters, readings, users…) from the old Neon database into this server's database.
# The Neon address is asked for here and never saved to disk.
set -euo pipefail
cd /opt/uzlitr
# The address can come from /root/neon.txt (sent from the laptop's clipboard, see deploy/README.md),
# which is deleted right after reading; otherwise it is pasted here.
NEON_FILE=/root/neon.txt
if [ -s "$NEON_FILE" ]; then
  RAW=$(cat "$NEON_FILE")
  shred -u "$NEON_FILE" 2>/dev/null || rm -f "$NEON_FILE"
  # Accept a whole copied line such as DATABASE_URL="postgresql://…" and keep just the address.
  NEON=$(printf '%s' "$RAW" | grep -oE "postgres(ql)?://[^\"' [:space:]]+" | head -n1 || true)
  [ -n "$NEON" ] || { echo "No postgresql:// address found in what was sent (it began with: $(printf '%s' "$RAW" | tr -d '[:space:]' | cut -c1-10)…)."; echo "Copy the DATABASE_URL again and resend it."; exit 1; }
  echo "Using the Neon address from $NEON_FILE (file deleted)."
else
  echo "Paste the Neon DATABASE_URL with a RIGHT-CLICK (not Ctrl+V), then press Enter."
  echo "It starts with postgresql:// — check it looks right before pressing Enter."
  read -rp "Neon URL: " NEON </dev/tty
  NEON=$(printf '%s' "$NEON" | grep -oE "postgres(ql)?://[^\"' [:space:]]+" | head -n1 || true)
fi
case "$NEON" in postgres://*|postgresql://*) ;; *) echo "That doesn't start with postgresql:// — nothing was changed. Run the script again."; exit 1;; esac
[ -n "$NEON" ] || { echo "Empty, stopping."; exit 1; }
clear
echo "This REPLACES the data on this server with the data from Neon."
read -rp "Type YES to continue: " OK </dev/tty
[ "$OK" = "YES" ] || { echo "Cancelled."; exit 1; }

mkdir -p deploy/backups
echo "==> Backing up this server's current database first…"
docker compose exec -T db pg_dump -U uzlitr -d uzlitr | gzip > "deploy/backups/before-migration-$(date +%F-%H%M).sql.gz"

echo "==> Copying from Neon…"
docker compose stop app cron >/dev/null
docker compose exec -T db psql -q -U uzlitr -d uzlitr -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker run --rm postgres:17-alpine pg_dump --schema=public --no-owner --no-privileges "$NEON" \
  | grep -v '^CREATE SCHEMA public;$' \
  | docker compose exec -T db psql -q -U uzlitr -d uzlitr -v ON_ERROR_STOP=1 >/dev/null
docker compose start app cron >/dev/null

echo "==> Copied:"
docker compose exec -T db psql -U uzlitr -d uzlitr -Atc "
  SELECT 'customers: ' || count(*) FROM customers UNION ALL SELECT 'meters: ' || count(*) FROM meters
  UNION ALL SELECT 'readings: ' || count(*) FROM readings UNION ALL SELECT 'users: ' || count(*) FROM users"
echo "✅ Done. Sign in with the same phone and password as before."
