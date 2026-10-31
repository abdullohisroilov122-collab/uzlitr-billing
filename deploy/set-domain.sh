#!/usr/bin/env bash
# Points the site at a domain:  bash deploy/set-domain.sh myuzlitrpro.uz
# Sets SITE_ADDRESS to the domain, its www. version and this server's sslip.io address, then restarts HTTPS.
set -euo pipefail
cd /opt/uzlitr
DOMAIN=$(printf '%s' "${1:-}" | tr 'A-Z' 'a-z' | sed 's#^https\?://##; s#^www\.##; s#/.*$##')
[ -n "$DOMAIN" ] || { echo "Usage: bash deploy/set-domain.sh myuzlitrpro.uz"; exit 1; }
IP=$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
SITE="$DOMAIN, www.$DOMAIN, ${IP//./-}.sslip.io"

RESOLVED=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')
echo "Domain:      $DOMAIN"
echo "This server: $IP"
echo "DNS points:  ${RESOLVED:-nothing yet}"
if [ "$RESOLVED" != "$IP" ]; then
  echo "⚠️  $DOMAIN does not point to this server yet. Check the A record, wait a little, then run this again."
  exit 1
fi

sed -i '/^SITE[_ ]ADDRESS/d' .env
echo "SITE_ADDRESS=$SITE" >> .env
docker compose up -d --force-recreate caddy
echo
echo "✅ Done. In a minute open: https://$DOMAIN"
