#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server: Docker, firewall, swap, the app, its settings (.env), start.
# Run as root:  curl -fsSL https://raw.githubusercontent.com/abdullohisroilov122-collab/uzlitr-billing/main/deploy/setup.sh | bash
set -euo pipefail
REPO=https://github.com/abdullohisroilov122-collab/uzlitr-billing.git
DIR=/opt/uzlitr

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo -i)."; exit 1; }
echo "==> 1/5 Updating Ubuntu and installing Docker, firewall…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq docker.io docker-compose-v2 git ufw fail2ban unattended-upgrades openssl curl
systemctl enable --now docker fail2ban

echo "==> 2/5 Swap (extra memory for building the site on a 2 GB server)…"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 3/5 Firewall: only SSH, HTTP and HTTPS are open…"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "==> 4/5 Getting the code…"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull -q; else git clone -q "$REPO" "$DIR"; fi
cd "$DIR"
mkdir -p deploy/backups && chmod 700 deploy/backups

if [ ! -f .env ]; then
  IP=$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
  DEFAULT_SITE="${IP//./-}.sslip.io"
  echo
  echo "Site address. Press Enter to use $DEFAULT_SITE for now (works right away, with HTTPS)."
  echo "Later, when myuzlitrpro.uz points to this server, change SITE_ADDRESS in $DIR/.env."
  read -rp "Site address [$DEFAULT_SITE]: " SITE </dev/tty; SITE=${SITE:-$DEFAULT_SITE}
  read -rp "First admin phone (only used if the database is empty), e.g. +998901234567: " ADMIN_PHONE </dev/tty
  read -rsp "First admin password (min 8, upper+lower+digit): " ADMIN_PASSWORD </dev/tty; echo
  umask 077
  cat > .env <<ENV
# UZLITR settings. Keep this file secret.
SITE_ADDRESS=$SITE
DB_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 24)
ADMIN_PHONE=$ADMIN_PHONE
ADMIN_PASSWORD=$ADMIN_PASSWORD
# Uztelecom sending stays paused until these two are filled in (remove the #), then run deploy/update.sh:
# VODOKANAL_API_URL=https://watermeter.uztelecom.uz/api/Meter/Post
# VODOKANAL_API_KEY=
ENV
fi

echo "==> 5/5 Building and starting (first time takes ~5 minutes)…"
docker compose up -d --build
docker image prune -f >/dev/null
SITE=$(grep '^SITE_ADDRESS=' .env | cut -d= -f2)
echo
echo "✅ Done! Open: https://$SITE"
echo "   Move the old data from Neon:  bash $DIR/deploy/migrate-from-neon.sh"
