# Local self-hosted Supabase (DB testing)

Isolated from the app’s `compose.yaml` (`web` + `api`). Ordinary `docker compose up` in the repo root does **not** pull this stack.

Follows the official guide: [Self-Hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker). Postgres access: [Accessing Postgres](https://supabase.com/docs/guides/self-hosting/accessing-postgres).

## Why a separate project

- Full Supabase is heavy (≈4 GB RAM+). Keep app rehearsal lightweight.
- Official compose hardcodes `container_name` values — only **one** Supabase stack per host is practical. Parallel **app** worktrees share it (different `WEB_PORT` / `API_PORT`).

## Setup (once)

```bash
# From repo root
sh docker/supabase/setup.sh
cd docker/supabase/.stack
sh utils/generate-keys.sh
sh utils/add-new-auth-keys.sh
# Optional for local email signup without SMTP:
#   ENABLE_EMAIL_AUTOCONFIRM=true  in .env
docker compose pull
sh ../up.sh start   # or: sh run.sh start
sh run.sh secrets
```

Pinned release: `self-hosted/v0.8.3` (override with `SUPABASE_SELFHOST_REF`). `.stack/` is gitignored (secrets + volumes).

Port / project defaults live in `env.ports.example` and are appended into `.stack/.env` by setup. Remap if `8000` / `5432` / `6543` are busy (see that file).

## Point the Mathz app at it

After `sh run.sh secrets`, copy into `.env` / `.env.local` (never commit):

| App env | From self-hosted |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `SUPABASE_PUBLIC_URL` (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` (prefer publishable when generated) |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` |
| `DATABASE_URL` | Transaction pooler (6543) — see below |
| `DIRECT_URL` | Session pooler (5432) — see below |

Default Supavisor usernames include the tenant id (`POOLER_TENANT_ID` in `.env`):

```bash
# Transaction mode (app queries) — matches ?pgbouncer=true usage
DATABASE_URL="postgresql://postgres.YOUR_TENANT_ID:YOUR_POSTGRES_PASSWORD@localhost:6543/postgres?pgbouncer=true"

# Session mode (Prisma migrate / db push)
DIRECT_URL="postgresql://postgres.YOUR_TENANT_ID:YOUR_POSTGRES_PASSWORD@localhost:5432/postgres"
```

Replace `YOUR_TENANT_ID` / `YOUR_POSTGRES_PASSWORD` from `.stack/.env`. If you remapped ports, use those host ports instead.

Then:

```bash
pnpm db:push          # or pnpm db:migrate
pnpm db:check-url     # optional connectivity check
# App stack (separate compose project):
docker compose up --build
# or: pnpm dev
```

Studio: `http://localhost:8000` (HTTP basic auth = `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`).

## Stop / reset

```bash
sh docker/supabase/up.sh stop
# Full wipe (destroys DB volumes): cd docker/supabase/.stack && sh reset.sh
```

## Parallel worktrees

| Stack | How |
| --- | --- |
| App A | defaults `WEB_PORT=3000` `API_PORT=3001` |
| App B | `WEB_PORT=3010 API_PORT=3011 docker compose up` |
| Supabase | one shared `mathz-supabase` (or remapped ports from `env.ports.example`) |

Do not add this stack into the root `compose.yaml` profile unless you accept the resource cost and fixed container names.
