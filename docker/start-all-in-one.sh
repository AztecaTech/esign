#!/bin/sh
# Runs embedded PostgreSQL (127.0.0.1 only) then the Remix app.
# Persist /app/data in Dokploy (or any host) so the database survives restarts.

set -e

POSTGRES_USER="${POSTGRES_USER:-documenso}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-changeme}"
POSTGRES_DB="${POSTGRES_DB:-documenso}"
PGDATA="${PGDATA:-/app/data/postgres}"
PORT="${PORT:-3000}"

# URL-unsafe characters in POSTGRES_PASSWORD will break the URL; use alphanumeric in production.
export NEXT_PRIVATE_DATABASE_URL="${NEXT_PRIVATE_DATABASE_URL:-postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}}"
export NEXT_PRIVATE_DIRECT_DATABASE_URL="${NEXT_PRIVATE_DIRECT_DATABASE_URL:-${NEXT_PRIVATE_DATABASE_URL}}"
export NEXT_PRIVATE_INTERNAL_WEBAPP_URL="${NEXT_PRIVATE_INTERNAL_WEBAPP_URL:-http://127.0.0.1:${PORT}}"

mkdir -p /run/postgresql
chown postgres:postgres /run/postgresql 2>/dev/null || true

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[all-in-one] Initializing PostgreSQL in $PGDATA"
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA"
  su postgres -s /bin/sh -c "initdb -D '$PGDATA' -E UTF8 --locale=C"

  printf '\n%s\n' "listen_addresses = '127.0.0.1'" >>"$PGDATA/postgresql.conf"

  su postgres -s /bin/sh -c "pg_ctl -D '$PGDATA' -w -l /tmp/postgres-init.log -o '-h 127.0.0.1' start"

  passwd_escaped=$(printf '%s' "$POSTGRES_PASSWORD" | sed "s/'/''/g")
  su postgres -s /bin/sh -c "psql -v ON_ERROR_STOP=1 -c \"CREATE ROLE \\\"$POSTGRES_USER\\\" WITH LOGIN PASSWORD '$passwd_escaped';\""

  su postgres -s /bin/sh -c "psql -v ON_ERROR_STOP=1 -c \"CREATE DATABASE \\\"$POSTGRES_DB\\\" OWNER \\\"$POSTGRES_USER\\\";\""

  su postgres -s /bin/sh -c "pg_ctl -D '$PGDATA' -m fast stop"
fi

chown -R postgres:postgres "$PGDATA"
echo "[all-in-one] Starting PostgreSQL"
su postgres -s /bin/sh -c "pg_ctl -D '$PGDATA' -w -l /tmp/postgres.log -o '-h 127.0.0.1' start"

until su postgres -s /bin/sh -c "pg_isready -h 127.0.0.1 -p 5432"; do
  sleep 0.5
done

CERT_PATH="${NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH:-/opt/documenso/cert.p12}"
if [ -f "$CERT_PATH" ] && [ -r "$CERT_PATH" ]; then
  echo "[all-in-one] Signing certificate present at $CERT_PATH"
else
  echo "[all-in-one] Warning: no readable cert at $CERT_PATH (signing may be unavailable)"
fi

echo "[all-in-one] Running database migrations"
cd /app/apps/remix
su nodejs -s /bin/sh -c "cd /app/apps/remix && npx prisma migrate deploy --schema ../../packages/prisma/schema.prisma"

echo "[all-in-one] Starting app on port $PORT"
exec su nodejs -s /bin/sh -c "cd /app/apps/remix && HOSTNAME=0.0.0.0 PORT=$PORT node build/server/main.js"
