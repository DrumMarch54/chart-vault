# Setting up Chart Vault on the VPS (plain words)

Chart Vault runs the same way as the TikTok Shop Pipeline app:

| | TikTok Shop Pipeline | Chart Vault |
|---|---|---|
| Folder on the VPS | /root/tiktok_pipeline | /root/chart-vault |
| Data (database, images) | inside the app folder | /root/chart-vault-data (own folder) |
| Daily backup | – | /root/chart-vault-backups |
| Service name | tiktok-bot | chart-vault |
| Port (inside the VPS only) | 8080 | 8090 (or the next free one; the installer tells you) |
| Public address | Cloudflare Tunnel → app.tiktok-automation.com | Cloudflare Tunnel → charts.tiktok-automation.com |
| Password | WEB_TOKEN in .env | WEB_TOKEN in /root/chart-vault/.env |
| New versions | cron runs /root/autodeploy.sh every minute, follows `master` | cron runs /root/chart-vault-autodeploy.sh every minute, follows `main` |
| Log of deploys | /root/autodeploy.log | /root/chart-vault-autodeploy.log |

It never touches the other apps: different folder, different port, different
service, different cron line.

## One-time install (about 5 minutes)

1. Hostinger hPanel → VPS → **Web console** (you are root).
2. Type this one line and press Enter:

   ```
   git clone https://github.com/DrumMarch54/chart-vault.git /root/chart-vault && bash /root/chart-vault/deploy/install.sh
   ```

3. It installs Node.js if needed, then asks:
   `Type the password you want for Chart Vault, then press Enter:`
   Type the password you want to use on your phone and press Enter.
4. When it finishes you should see:
   `SUCCESS: Chart Vault is running on port 8090.`
   (If the port number is different, use that number in the next step.)
5. Cloudflare dashboard → Zero Trust → Networks → Tunnels → your tunnel →
   **Public hostname** → Add:
   - Subdomain: `charts`   Domain: `tiktok-automation.com`
   - Type: `HTTP`   URL: `localhost:8090`
   Save.
6. On the phone open https://charts.tiktok-automation.com. You should see the
   Chart Vault login screen. Log in with the password from step 3.
7. In the browser menu choose **Add to Home screen** (Samsung Internet: menu →
   Add page to → Home screen). The app icon is a 3×3 grid with "12".

## Useful commands (web console)

```
systemctl status chart-vault                 # is it running?
journalctl -u chart-vault -n 50 --no-pager   # last 50 log lines
tail -20 /root/chart-vault-autodeploy.log    # what the deployer did
```

## How updates reach the server

Nothing on GitHub deploys by itself. The VPS checks the `main` branch every
minute; when it changed, it waits while an upload or backup is in progress
(up to 10 minutes), then updates, installs, and restarts the service. The app
shows "Updated, tap to reload" within a minute.

Claude sessions push with: `git push origin <branch>:main`.

## If something goes wrong

- Site shows an error page: the service is down. Run
  `systemctl restart chart-vault`, then `journalctl -u chart-vault -n 50 --no-pager`
  and paste the lines into a chat with Claude.
- Forgot the password: `nano /root/chart-vault/.env`, change the WEB_TOKEN
  line, save (Ctrl+O, Enter, Ctrl+X), then `systemctl restart chart-vault`.
  Every phone has to log in again.
- Restoring from a backup: stop the service, copy `chart-vault.sqlite` and the
  `images` and `thumbs` folders from the backup into /root/chart-vault-data,
  start the service. Missing thumbnails are rebuilt on start.
