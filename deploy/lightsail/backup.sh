#!/bin/sh
# Daily backup of the database and listing photos into ./backups, keeping the last 14 days.
# Add to cron on the server:  crontab -e  then
#   30 3 * * * cd /home/ubuntu/ask231/deploy/lightsail && sh backup.sh >> backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")"
mkdir -p backups
stamp=$(date +%Y-%m-%d_%H%M)
env_value() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2-; }
DB_USER=$(env_value DB_USER)
DB_NAME=$(env_value DB_NAME)
docker compose exec -T db pg_dump -U "${DB_USER:-ask231}" -d "${DB_NAME:-ask231}" | gzip > "backups/db_$stamp.sql.gz"
docker compose exec -T backend tar -czf - -C /app media > "backups/media_$stamp.tar.gz"
find backups -name 'db_*.sql.gz' -mtime +14 -delete
find backups -name 'media_*.tar.gz' -mtime +14 -delete
echo "backup done: $stamp"
