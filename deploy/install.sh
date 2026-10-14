#!/usr/bin/env bash
# One-time setup of Chart Vault on the VPS. Safe to run again.
# Usage (as root, in the Hostinger web console):
#   git clone https://github.com/DrumMarch54/chart-vault.git /root/chart-vault && bash /root/chart-vault/deploy/install.sh
set -e
APP_DIR=/root/chart-vault
PORT_DEFAULT=8090
cd "$APP_DIR"

echo "== Chart Vault setup =="

# 1. Node.js 22 (the other apps are Python, so Node may be missing).
if ! command -v node >/dev/null 2>&1 || [ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -lt 20 ]; then
  echo "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y nodejs >/dev/null
fi
echo "Node $(node -v), npm $(npm -v)"

# 2. Make sure we are on main and up to date.
git fetch -q origin main
git checkout -q -B main origin/main

# 3. Dependencies.
npm ci --omit=dev --no-audit --no-fund >/dev/null
echo "Dependencies installed."

# 4. The .env with the password and port (only created once; never overwritten).
if [ ! -f .env ]; then
  PORT=$PORT_DEFAULT
  while ss -ltn 2>/dev/null | grep -q ":${PORT} "; do PORT=$((PORT + 1)); done
  echo
  read -r -p "Type the password you want for Chart Vault, then press Enter: " PW < /dev/tty
  [ -n "$PW" ] || { echo "Password cannot be empty. Run the script again."; exit 1; }
  cat > .env <<ENV
WEB_TOKEN=$PW
PORT=$PORT
HOST=127.0.0.1
DATA_DIR=/root/chart-vault-data
BACKUP_DIR=/root/chart-vault-backups
ENV
  chmod 600 .env
  echo "Saved settings to $APP_DIR/.env (port $PORT)."
else
  echo "Keeping the existing $APP_DIR/.env."
fi
PORT=$(grep -E '^PORT=' .env | cut -d= -f2-)

# 5. systemd service.
cp deploy/chart-vault.service /etc/systemd/system/chart-vault.service
systemctl daemon-reload
systemctl enable -q chart-vault
systemctl restart chart-vault

# 6. Auto-deploy every minute from GitHub (main branch).
cp deploy/autodeploy.sh /root/chart-vault-autodeploy.sh && chmod +x /root/chart-vault-autodeploy.sh
( crontab -l 2>/dev/null | grep -v chart-vault-autodeploy ; echo "* * * * * /root/chart-vault-autodeploy.sh" ) | crontab -
systemctl restart cron 2>/dev/null || true

# 7. Check.
sleep 2
if curl -s -m 5 "http://127.0.0.1:${PORT}/api/health" | grep -q '"ok":true'; then
  echo
  echo "SUCCESS: Chart Vault is running on port $PORT."
  echo "Next: in Cloudflare Zero Trust, add a public hostname pointing to  localhost:${PORT}"
else
  echo
  echo "Something is wrong. Last log lines:"
  journalctl -u chart-vault -n 20 --no-pager
  exit 1
fi
