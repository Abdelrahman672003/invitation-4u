#!/bin/bash
# Once per interval: dumps the MySQL database (consistent, without locking the site) and archives the
# uploaded files, both into /backups (a Docker volume), then deletes copies older than BACKUP_KEEP_DAYS.
# The volume lives on this server: also copy it somewhere else (see docs/deployment.md).
set -euo pipefail

OUT=/backups
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
export MYSQL_PWD="$MYSQL_PASSWORD"

mkdir -p "$OUT"
while true; do
  stamp=$(date -u +%Y%m%d-%H%M%S)
  if mysqldump -h db -u "$MYSQL_USER" --single-transaction --no-tablespaces --routines "$MYSQL_DATABASE" \
      | gzip > "$OUT/db-$stamp.sql.gz.part"; then
    mv "$OUT/db-$stamp.sql.gz.part" "$OUT/db-$stamp.sql.gz"
    echo "$(date -u) database dumped: db-$stamp.sql.gz"
  else
    rm -f "$OUT/db-$stamp.sql.gz.part"
    echo "$(date -u) DATABASE DUMP FAILED" >&2
  fi
  if [ -d /data/uploads ]; then
    tar -czf "$OUT/uploads-$stamp.tar.gz" -C /data uploads
    echo "$(date -u) uploads archived: uploads-$stamp.tar.gz"
  fi
  find "$OUT" -type f -mtime "+$KEEP_DAYS" -delete
  sleep $((INTERVAL_HOURS * 3600))
done
