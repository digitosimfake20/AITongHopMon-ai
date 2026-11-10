# CI and Dependabot (Mathz)

Intended continuous integration and dependency automation for AITongHopMon-ai. Package manager: **pnpm@10.15.1** (`packageManager` field). Existing scripts: `lint`, `test` (Vitest), `build`.

The app historically had **no** `.github/` tree; CI/Dependabot should land as a **standalone** chore PR (e.g. `chore/ci-dependabot`) that does **not** claim remediation of issue [#27](https://github.com/digitosimfake20/AITongHopMon-ai/issues/27).

## Goals

1. Fail pull requests on basic quality gates without needing production secrets.
2. Keep GitHub Actions and npm dependencies current via Dependabot.
3. Host a small, always-green security helper suite that #27 (and later audits) can extend.

## Intended GitHub Actions workflow

**Path:** `.github/workflows/ci.yml`

### Triggers

- `pull_request`
- `push` to `main`

### Jobs (lean, GitHub-hosted runners)

| Job | Command | Notes |
|---|---|---|
| `lint` | `pnpm lint` | Prefer fail on ESLint errors. If `main` is still too noisy, fail only on errors and keep warnings non-blocking until cleaned up. |
| `test` | `pnpm test` | Vitest unit suite. Must not require live DB / Supabase / OpenAI. |
| `typecheck` (optional) | `tsc --noEmit` | Include only if it works without full Next runtime secrets; otherwise skip until env stubs are documented. |

### Setup pattern

1. `pnpm/action-setup` for the pinned pnpm version.
2. `actions/setup-node` with pnpm cache.
3. `pnpm install` (frozen lockfile when the repo supports it).
4. Ensure `prisma generate` runs (postinstall usually covers this; add an explicit step if CI env skips lifecycle scripts).
5. Provide dummy `NEXT_PUBLIC_*` placeholders in workflow comments/env only if a job needs them.

### What not to require in CI (initially)

- Real `DATABASE_URL`, Supabase service role, or OpenAI keys.
- Full `pnpm build` / `next build` unless it succeeds with documented dummy env. Unit tests + lint are the minimum bar.
- Browser E2E or live Storage uploads (anticheat capture tests inject stubs).

## Dependabot

**Path:** `.github/dependabot.yml`

| Ecosystem | Cadence | Notes |
|---|---|---|
| `npm` | weekly | Works with the pnpm lockfile under the npm ecosystem key |
| `github-actions` | weekly | Keeps Actions SHAs/tags current |

Keep the config simple:

- Open-PR limit around 5–10.
- Optional grouping (production vs development) only if noise becomes a problem.
- No secrets in Dependabot config.

## How audit / security helper tests fit

Issue #27 remediation and future audits need regression tests that CI can run offline.

### Preferred pattern

1. Introduce **pure** helpers under something like `lib/security/` (example: `sanitizeAuthCallbackNext(next, origin)`).
2. Cover them with Vitest (`*.test.ts`) that pass **before** route wiring lands.
3. Wire routes/actions in the security PR (or a trivial follow-up) so CI already proves the helper.

### Minimum useful coverage for the CI PR

- Auth callback `next` allowlist helper + deny cases (`//`, `@`, schemes, absolute URLs).
- Placeholders or thin suites under `lib/security/` that #27 expands for submit gates, parse caps, etc., without turning the CI PR into a product fix dump.

### Anticheat tests in the same Vitest run

`lib/anticheat/*.test.ts` and `lib/supabase/anticheat-storage*.test.ts` are ordinary unit tests: synthetic frames, injected `getDisplayMedia`, mocked admin client. They should ride the same `pnpm test` job — no special workflow — as long as they stay offline.

### Separation from #27

| PR | Owns |
|---|---|
| CI / Dependabot | Workflows, Dependabot, pure security helpers + green tests |
| `#27` fix | Route/action remediations, `Fixes #27` autoclose — rebase onto main after CI lands if needed |

Do not put `Fixes #27` on the CI PR.

## Operator checklist

1. Confirm `.github/workflows/ci.yml` and `.github/dependabot.yml` exist on the target branch.
2. Push a no-op or docs-only PR and verify lint + test jobs appear.
3. Confirm Dependabot opens weekly PRs (or is enabled in repo settings).
4. When adding audit regressions, keep them pure/mocked so CI stays secret-free.
5. If `prisma generate` fails in CI, add the smallest env stub that unblocks generate — do not point CI at production.

## Related docs

- [Anticheat overview](./anticheat.md) — product monitoring phases and modules under test
- [Security audit run-1 remediation](./security-audit-run-1.md) — findings the helper tests should eventually guard
