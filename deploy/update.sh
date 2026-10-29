#!/usr/bin/env bash
# Gets the newest code from GitHub and restarts the site. Data is kept.
set -euo pipefail
cd /opt/uzlitr
git pull -q
docker compose up -d --build
docker image prune -f >/dev/null
echo "✅ Updated."
