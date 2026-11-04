#!/usr/bin/env sh
# Sparse-clone official Supabase Docker self-host config into .stack/ (gitignored).
# Follows: https://supabase.com/docs/guides/self-hosting/docker (manual / sparse clone)
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
STACK="$ROOT/.stack"
REF="${SUPABASE_SELFHOST_REF:-self-hosted/v0.8.3}"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

if [ -f "$STACK/docker-compose.yml" ]; then
  echo "Already set up: $STACK"
  echo "To refresh, remove docker/supabase/.stack and re-run this script."
  exit 0
fi

echo "Fetching supabase/docker @ $REF ..."
git clone --filter=blob:none --no-checkout --depth=1 --quiet --branch "$REF" \
  https://github.com/supabase/supabase "$TMP/supabase"
cd "$TMP/supabase"
git sparse-checkout init --cone
git sparse-checkout set docker
git checkout --quiet

mkdir -p "$STACK"
cp -a "$TMP/supabase/docker/." "$STACK/"
cd "$STACK"
cp -n .env.example .env
printf 'ref=%s\n' "$REF" > .supabase-version

# Merge parallel-safe host port / project defaults without overwriting secrets.
PORTS_EXAMPLE="$ROOT/env.ports.example"
if [ -f "$PORTS_EXAMPLE" ]; then
  {
    echo ""
    echo "# --- mathz parallel-worktree port / project defaults (from env.ports.example) ---"
    grep -E '^(COMPOSE_PROJECT_NAME|API_GW_HTTP_PORT|POSTGRES_PORT|POOLER_PROXY_PORT_TRANSACTION|SUPABASE_PUBLIC_URL|API_EXTERNAL_URL|SITE_URL)=' \
      "$PORTS_EXAMPLE" || true
  } >> .env
fi

echo ""
echo "Copied official docker/ into $STACK"
echo "Next (required before first start — do not use placeholder secrets):"
echo "  cd docker/supabase/.stack"
echo "  sh utils/generate-keys.sh"
echo "  sh utils/add-new-auth-keys.sh"
echo "  # optional local auth: set ENABLE_EMAIL_AUTOCONFIRM=true in .env"
echo "  docker compose pull"
echo "  sh run.sh start"
echo "  sh run.sh secrets"
echo ""
echo "Or from repo root: sh docker/supabase/up.sh"
echo "Docs: docker/supabase/README.md"
