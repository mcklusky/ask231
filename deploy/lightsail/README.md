# Deploying ask231 on AWS Lightsail

Everything runs on one Lightsail server with Docker:

- **Caddy** serves the website and gets the HTTPS certificate by itself.
- **Django** answers `/api`, `/admin`, share links (`/s/...`) and the health check.
- **Postgres** holds the data.
- Listing photos are kept on the server's disk.

The commands below are typed into the server's terminal, unless a step says otherwise.

## 1. Create the server (Lightsail console)

1. **Create instance** → Linux/Unix → **OS Only** → **Ubuntu 24.04 LTS**.
2. Region: choose a European one such as **Paris** or **London**. Liberia's internet runs through Europe, so pages load faster from there.
3. Plan: at least **2 GB RAM**. Building the site needs the memory, and 1 GB servers run out.
4. Name it `ask231` and create it.
5. **Networking** tab:
   - Create a **static IP** and attach it to the server.
   - Under IPv4 Firewall, add **HTTPS (TCP 443)**. SSH (22) and HTTP (80) are already open.
6. **Snapshots** tab: turn on **automatic snapshots**. This is a daily copy of the whole server.

## 2. Point the address at the server

- **With a domain** (e.g. ask231.com): at your domain provider, add an **A record** for `@`, pointing to the static IP. Add another for `www` if you want it.
- **Without a domain yet**: use the static IP with dashes plus `.sslip.io`. For example, IP `3.14.15.92` becomes `3-14-15-92.sslip.io`. This works straight away, with HTTPS, and costs nothing.

## 3. Install Docker

Click **Connect using SSH** in Lightsail, then run:

```sh
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Connect again so the change takes effect.

## 4. Get the code (private repo)

Give the server a read-only key to the GitHub repo:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/ask231_deploy -N ""
cat ~/.ssh/ask231_deploy.pub
```

1. On GitHub, open the repo → **Settings → Deploy keys → Add deploy key**.
2. Paste the key. Leave **Allow write access** off.

Then, back on the server:

```sh
printf 'Host github.com\n  IdentityFile ~/.ssh/ask231_deploy\n' >> ~/.ssh/config
git clone git@github.com:mcklusky/ask231.git
cd ask231/deploy/lightsail
```

## 5. Settings

```sh
cp .env.example .env
openssl rand -base64 48   # copy into DJANGO_SECRET_KEY
openssl rand -hex 24      # copy into DB_PASSWORD
nano .env
```

Set `DOMAIN`. Put the same address in `ALLOWED_HOSTS` (keep `,127.0.0.1` at the end), `FRONTEND_URL`, `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS`. The last three take it with `https://` in front.

To save in nano, press Ctrl+O then Enter. To quit, press Ctrl+X.

## 6. Start

```sh
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
```

The first build takes a few minutes. Then open `https://<your DOMAIN>`. The staff admin is at `/admin/`.

## Everyday tasks

| Task | Command (in `ask231/deploy/lightsail`) |
| --- | --- |
| Release new code | `git pull && docker compose up -d --build` |
| See what's running | `docker compose ps` |
| Django logs | `docker compose logs -f backend` |
| Restart everything | `docker compose restart` |
| Back up now | `sh backup.sh` |

Database changes are applied automatically each time the backend starts.

**Daily backups.** Run `crontab -e` and add this line:

```
30 3 * * * cd /home/ubuntu/ask231/deploy/lightsail && sh backup.sh >> backups/backup.log 2>&1
```

It keeps 14 days of database and photo backups in `backups/`. Those backups live on the same server, so also keep the Lightsail automatic snapshots on.

## Not working until set up

- **Email** (verification, password reset) and **text messages** (phone codes) are only printed in the logs (`docker compose logs backend`). Real users can't verify their accounts until you fill in the email and SMS settings in `.env`. After changing them, run `docker compose up -d`.
- If you change a `VITE_...` setting, rebuild the website: `docker compose up -d --build`.
