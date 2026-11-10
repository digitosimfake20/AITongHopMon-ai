# Security audit run-1 → remediation

Maps confirmed findings from the first Mathz security audit to the intended remediation approach tracked in GitHub issue [#27](https://github.com/digitosimfake20/AITongHopMon-ai/issues/27).

**Source run:** `run-1` against commit `56b6dda` (`main`). Full evidence stays under `~/security-audit-skill/AITongHopMon-ai/run-1/` (reports, ledger, redacted artifacts). This page is the durable operator-facing summary — **no PII, class codes, cookies, or live roster data**.

## Context

| Item | Value |
|---|---|
| Issue | [#27](https://github.com/digitosimfake20/AITongHopMon-ai/issues/27) |
| Audited commit | `56b6dda0f6b60f1d86bd791a0fdb52e51b410e36` |
| Profile | `standard` |
| Production target (owner-authorized) | `https://aitonghopmon-ai.vercel.app` |
| Remediation PR intent | Single product PR with `Fixes #27`; keep CI/Dependabot in a separate PR |

Re-verify each sink on current `main` before editing — paths below matched the audit tip.

## Confirmed findings and remediation approach

### 1. HIGH — OAuth callback open redirect

- **Fingerprint:** `app/auth/callback/route.ts:next-param-open-redirect`
- **Problem:** After a successful code exchange, `next` is concatenated onto the request origin without an allowlist. Values like `@evil.example` can redirect the post-login navigation off-site via WHATWG URL parsing.
- **Approach:** Accept only same-origin relative paths that start with a single `/`; reject `//`, `@`, schemes, userinfo, and backslashes. Prefer a pure helper such as `sanitizeAuthCallbackNext(next, origin)` (shareable with CI regression tests) and redirect with `new URL(safePath, origin)`. Default safe path: `/onboarding`.
- **Primary files:** `app/auth/callback/route.ts`, shared helper under `lib/security/` (or equivalent), unit tests for allow/deny cases.

### 2. HIGH — `submitQuizAction` skips membership / assignment gates

- **Fingerprint:** `submitQuizAction.missing-membership-assignment-gates`
- **Problem:** Submit grades/inserts without the same ClassMember / schedule / maxAttempts / adaptive sequencing checks used by `getQuizForTaking`.
- **Approach:** Enforce the take-path authz before grade/insert. Extract a shared gate helper if needed so take and submit cannot drift. Add a focused unit test with mocks around the shared helper.
- **Primary files:** `app/actions/quiz-submission.ts`, `lib/quiz/quiz-bank-queries.ts` (or extracted authz helper).

### 3. HIGH — Adaptive round helpers exported without auth

- **Fingerprint:** `test-group.recordAdaptiveRoundSubmit.exported-without-auth`
- **Problem:** `recordAdaptiveRound1Submit` / `recordAdaptiveRound2Submit` are reachable as Server Actions and can accept client-supplied identity.
- **Approach:** Move implementations to a non-`'use server'` module (e.g. `lib/adaptive/...`). Call only from trusted server paths such as `submitQuizAction`, binding `studentId` from the session. Ensure they are not client-invokable Server Actions.
- **Primary files:** `app/actions/test-group.ts`, new `lib/adaptive/` (or similar) module, `submitQuizAction` call sites.

### 4. HIGH — Teachers can publish/delete global system test bank

- **Fingerprint:** `system-test.teacher-global-bank-publish-delete`
- **Problem:** Teachers can mutate `isSystem` bank entries that should be admin-owned.
- **Approach:** Restrict publish/delete of system bank to `admin` only. Teachers keep assign-only APIs. Gate `/admin/test-bank` (redirect/forbidden for teachers). Align error copy with admin-only semantics.
- **Primary files:** `app/actions/system-test.ts`, related publish paths in test-group actions, `app/admin/test-bank/page.tsx`.

### 5. MEDIUM — Roster-by-code disclosure without membership ACL

- **Fingerprint:** `app/actions/roster.ts:getRosterByCodeAction-unauth-roster-disclosure`
- **Problem:** Loading a classroom by join code returned roster fields (including link identifiers) without a sensible authenticated ACL. Edge login gates reduce anonymous access but any authenticated caller with a code could over-read.
- **Approach:** Require `getSessionUser`. Minimize response fields — prefer `claimed: boolean` over returning link UUIDs to callers that should not see them. Keep claim/join flows working; optionally throttle by code.
- **Primary files:** `app/actions/roster.ts`, onboarding join consumers.

### 6. MEDIUM — Student analyze rewrites shared `Question` topics

- **Fingerprint:** `analyzeSubmissionAction.autoFixTopics-shared-question-mutation`
- **Problem:** Student-triggered analyze can `UPDATE core.questions` topic fields shared across classmates on the same test.
- **Approach:** Stop mutating shared question rows from the student analyze path. Persist inferred topics on submission / feedback JSON only; teacher/admin paths may still own bank edits if product requires it.
- **Primary files:** `app/actions/analyze-submission.ts`.

### 7. MEDIUM — DOCX ZIP expand without uncompressed cap

- **Fingerprint:** `parseQuizFileAction/docx-jszip-no-uncompressed-cap`
- **Problem:** Upload gates compressed size only; JSZip materialization has no uncompressed byte/entry budget (zip-bomb risk on shared workers).
- **Approach:** Cap uncompressed bytes and/or entry count before string materialization (e.g. reject above a documented MiB/entry threshold).
- **Primary files:** `app/actions/parse-quiz-file.ts`.

### 8. MEDIUM — PDF text fallback bypasses vision page limit

- **Fingerprint:** `parseQuizFileAction/pdf-text-fallback-unbounded-pages`
- **Problem:** Vision rendering caps at 8 pages, but text fallback can extract the full PDF before prompt char limits apply.
- **Approach:** Apply the same page (or extract-time) budget on the text fallback path as on vision (8 pages).
- **Primary files:** `app/actions/parse-quiz-file.ts`.

## Needs validation — harden role upsert

- **Fingerprint:** `lib/auth/session.ts:syncUserProfile-role-upsert-writable`
- **Concern:** Whether Auth metadata can influence `role` on upsert (including minting `admin`).
- **Approach regardless of live-project proof:** Never write `role` on upsert **update**; whitelist `student|teacher` on **create** only; never mint `admin` from Auth metadata.
- **Primary file:** `lib/auth/session.ts` (`syncUserProfile`).

## Suggested fix order

1. Auth callback allowlist (high, small blast radius).
2. Submit-path membership/assignment gates + adaptive helpers out of `'use server'`.
3. Admin-only system bank mutations + page gate.
4. Roster ACL / field minimization.
5. Analyze topic persistence boundary.
6. DOCX / PDF parse budgets.
7. Role upsert harden (always, even if production metadata cannot set admin today).

## Testing expectations

- Unit tests for pure helpers (callback `next` sanitize, shared submit gates, parse caps) should run under `pnpm test` without real `DATABASE_URL` / Supabase / OpenAI secrets.
- Do not commit production PII, cookies, or live class codes. Prefer redacted fixtures.
- Issue #27 remediation PR body should include exact autoclose syntax: `Fixes #27`.

## Related local artifacts

| Path | Contents |
|---|---|
| `run-1/REPORT.md` | Executive summary |
| `run-1/FINDINGS-DETAIL.md` | Per-finding traces |
| `run-1/findings.json` | Machine-readable findings |
| `run-1/NEEDS-VALIDATION.md` | Role-upsert open question |
| `run-1/coverage-ledger.json` | Coverage units |
