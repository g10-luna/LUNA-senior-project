#!/bin/sh
set -e
export PORT="${PORT:-8000}"
cd /app

if [ "${RUN_MIGRATIONS_ON_START:-true}" != "false" ]; then
  echo "[entrypoint] alembic upgrade head"
  /usr/local/bin/python -m alembic upgrade head || echo "[entrypoint] alembic exited non-zero (often OK if already at head)"
fi

sed "s/PLACEHOLDER_LISTEN/${PORT}/g" /app/nginx/nginx.render.conf > /etc/nginx/nginx.conf

echo "[entrypoint] nginx listening on ${PORT}, supervisord starting backends"
exec /usr/bin/supervisord -c /app/docker/supervisord.render.conf
