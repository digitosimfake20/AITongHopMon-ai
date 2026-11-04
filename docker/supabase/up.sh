#!/usr/bin/env sh
# Start (or stop) the gitignored official Supabase stack under .stack/.
# Does not touch the app compose.yaml web/api project.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
STACK="$ROOT/.stack"
ACTION="${1:-start}"

if [ ! -f "$STACK/docker-compose.yml" ]; then
  echo "Stack missing. Run: sh docker/supabase/setup.sh" >&2
  exit 1
fi

cd "$STACK"
# Prefer project name from .env; fall back so we never collide with app compose.
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-mathz-supabase}"

case "$ACTION" in
  start|up)
    if [ -x ./run.sh ] || [ -f ./run.sh ]; then
      sh run.sh start
    else
      docker compose up -d --wait
    fi
    echo "Gateway: see SUPABASE_PUBLIC_URL in .env (default http://localhost:8000)"
    echo "Secrets: sh run.sh secrets   (from docker/supabase/.stack)"
    ;;
  stop|down)
    if [ -f ./run.sh ]; then
      sh run.sh stop
    else
      docker compose stop
    fi
    ;;
  secrets)
    sh run.sh secrets
    ;;
  ps|status)
    docker compose ps
    ;;
  *)
    echo "Usage: sh docker/supabase/up.sh [start|stop|secrets|ps]" >&2
    exit 2
    ;;
esac
