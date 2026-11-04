# Mathz load-test harness

Sustained concurrent HTTP load against a configurable `BASE_URL` (this app only).  
**Not** a one-off curl — virtual users (VUs) loop for a duration with optional ramp and think-time.

## Tool choice

**Node 20+ script** (`run.mjs` + `lib/*`) using native `fetch`.

| Option | Why not / why |
|---|---|
| **k6** | Excellent, but not installed here and adds a separate binary. |
| **Artillery** | Fine npm option; still an extra dependency for a thin GET harness. |
| **Node (chosen)** | Already required by the Next app; zero install; clear concurrency; JSON results under `results/`. |

## Safety

- **Hard caps:** 50 VUs, 600s duration, 120s ramp (see `lib/config.mjs`).
- **Default host** `https://aitonghopmon-ai.vercel.app` is treated as production-like.
- Sustained / non-dry runs against production-like hosts need:

  ```bash
  LOADTEST_CONFIRM_PROD=1
  ```

- `--profile dry` / `--dry-run` skips the confirm gate (short smoke only).
- **Warning:** production load tests can **cost money**, trip **Vercel / WAF rate limits**, and affect real users. Prefer a local `BASE_URL=http://localhost:3000` when iterating.
- Never set `BASE_URL` to a third-party origin. Never commit cookies or `results/*.json` run artifacts with secrets.

## Quick start

```bash
# Smoke (1 VU, ~5s, public routes only — no prod confirm)
node loadtest/run.mjs --profile dry

# Modest default profile against local stack
BASE_URL=http://localhost:3000 node loadtest/run.mjs --profile modest --scenario public

# Modest against default Vercel host (explicit confirm)
LOADTEST_CONFIRM_PROD=1 node loadtest/run.mjs --profile modest

# Aggressive (still capped)
LOADTEST_CONFIRM_PROD=1 node loadtest/run.mjs --profile aggressive
```

Results: `loadtest/results/result-*.json` and `loadtest/results/latest.json` (gitignored except `.gitkeep`).

## Profiles

| Profile | VUs | Duration | Ramp | Think | Scenario | Notes |
|---|---:|---:|---:|---:|---|---|
| `dry` | 1 | 5s | 0 | 0 | public | One GET per target; smoke |
| `modest` | 5 | 30s | 5s | 200ms | mix | Default sustained |
| `aggressive` | 20 | 120s | 15s | 50ms | mix | Needs prod confirm on Vercel host |

Overrides: `--vus`, `--duration`, `--ramp`, `--think-ms`, `--scenario`, `--rsc` / `--rsc false`.

## Scenarios

| Name | Routes |
|---|---|
| `public` | `/`, `/login`, `/login/student`, `/login/teacher`, `/signup`, … |
| `student` | `/dashboard`, `/quizzes`, `/adaptive`, `/roadmap`, `/chat` (**auth required**) |
| `teacher` | `/teacher`, `/adaptive`, `/students`, `/assignments`, `/gaps`, `/test-bank` (**auth required**) |
| `hot` | Student+teacher hot paths if auth set; else public |
| `mix` | Public + auth hot paths when cookie/bearer present |

With `--rsc` (default on modest/aggressive), targets marked as RSC-hot also GET `?_rsc=1` with `RSC: 1` to approximate soft-nav `text/x-component` flights called out in the bottleneck analysis (multi-second `_rsc` on teacher adaptive/students/gaps and student shell pages).

Optional class scoping:

```bash
export LOADTEST_CLASS_ID='<classroom-uuid>'
```

## Authenticated runs (env-only secrets)

Protected student/teacher routes redirect to `/login` without a session. Drive them with a **browser-captured** cookie string (never commit):

1. Sign in as student or teacher on the target host.
2. DevTools → **Network** → document request → copy **Request Headers → Cookie**  
   (or Application → Cookies; Supabase typically uses `sb-*` / `*-auth-token`).
3. Export:

   ```bash
   export LOADTEST_COOKIE='sb-....=...; ...'
   # optional:
   export LOADTEST_BEARER='eyJ...'   # if you use bearer elsewhere
   export LOADTEST_CLASS_ID='...'
   LOADTEST_CONFIRM_PROD=1 node loadtest/run.mjs --profile modest --scenario teacher
   ```

Cookies expire; refresh before long soaks. Prefer a **dedicated test account**.

## Metrics

Each run prints and writes:

- **RPS**, request counts, **error rate**
- Latency **p50 / p95 / p99** (plus min/max/mean)
- Per-scenario breakdown

HTTP 2xx/3xx count as OK (redirects without auth are expected on protected routes if you forgot the cookie).

## Related evidence

Bottleneck analysis (sibling worktree / docs): multi-second `_rsc` on `/teacher/adaptive`, `/teacher/students`, `/teacher/assignments`, `/teacher/gaps`; student `/dashboard`, `/quizzes`, `/adaptive`, etc. This harness stresses those GETs under concurrency; it does **not** drive full quiz-submit or Zeno chat LLM turns.
