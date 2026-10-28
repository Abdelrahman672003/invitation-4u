#!/bin/sh
# Takes a consistent copy of the SQLite database (safe while the API is running) and an archive of the
# uploaded files, then deletes copies older than BACKUP_KEEP_DAYS. Runs forever, once per interval.
# These stay on this server: copy /backups somewhere else too (see docs/deployment.md).
set -eu

DB=/data/app.db
OUT=/backups
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"

mkdir -p "$OUT"
while true; do
  stamp=$(date -u +%Y%m%d-%H%M%S)
  if [ -f "$DB" ]; then
    sqlite3 "$DB" ".backup '$OUT/app-$stamp.db'" && gzip -f "$OUT/app-$stamp.db"
    echo "$(date -u) database backed up: app-$stamp.db.gz"
  else
    echo "$(date -u) no database yet, skipping"
  fi
  if [ -d /data/uploads ]; then
    tar -czf "$OUT/uploads-$stamp.tar.gz" -C /data uploads
    echo "$(date -u) uploads archived: uploads-$stamp.tar.gz"
  fi
  find "$OUT" -type f -mtime "+$KEEP_DAYS" -delete
  sleep $((INTERVAL_HOURS * 3600))
done
