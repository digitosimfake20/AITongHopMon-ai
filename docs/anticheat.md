# Mathz anticheat — overview

Screen-monitoring support for assigned class quizzes in AITongHopMon-ai (Mathz). Evidence flags are teacher-reviewed; **grades are never auto-changed** by triggers.

This page is the in-repo overview for what Phase 0–3 shipped. Ephemeral orchestration briefs were archived outside the app repo under the host audit folder (`~/security-audit-skill/AITongHopMon-ai/docs/archive/`).

## What shipped (Phase 0–3)

### Phase 0 — portable hash / trigger library

`lib/anticheat/` implements AC-1 defaults as pure TypeScript (Vitest-covered, no UI / Prisma / capture):

| Concern | Behavior |
|---|---|
| Frame path | RGBA → bilinear 64×64 → grayscale pHash (2D DCT-II, top-left 8×8, drop DC → 63 bits vs median) + HSV histogram (H×S×V = 16×4×4 = 256 bins) |
| Distances | pHash Hamming; HSV L1 on normalized histograms (range `[0, 2]`) |
| Defaults | `frozenMaxHamming: 4`, `frozenConsecutivePairs: 4`, `tabSwitchMinHamming: 20`, `histogramDeltaMin: 1.0` |
| Triggers | Deciding: `frozen`, `tab-switch`, `histogram-delta`. Soft `hint` / `visibilitychange` is recorded but **never decides alone** |

Public entry: `lib/anticheat/index.ts` (`computePHash`, `computeHsvHistogram`, `TriggerEvaluator`, thresholds helpers).

### Phase 1 — schema, APIs, consent / hint UI

**Schema (Prisma `core`):**

- `ClassTest.monitoringEnabled` (default `false`)
- Enums: `AnticheatConsentOutcome`, `AnticheatTrigger`, `AnticheatReviewDecision`, `AnticheatUnproctoredReason`
- Models: `AnticheatConsent`, `AnticheatFlag`, `AnticheatEvidence` (optional `framePath` for later storage)
- Optional on `Submission`: `unproctoredAt`, `unproctoredReason`, `unproctoredBy`

**Server actions** (`app/actions/anticheat.ts`), auth via `getSessionUser`:

| Action | Role |
|---|---|
| `startMonitoredAttemptAction` | Student — create/return `IN_PROGRESS` submission when monitoring is on |
| `recordConsentAction` | Student — one consent per submission (`granted` / `refused`) |
| `recordFlagAction` | Student — flags / soft hints; ~20 evidence/flag cap (`evidence_capped`) |
| `listFlagsForSubmissionAction` | Teacher of class, student owner, or admin |
| `reviewFlagAction` | Teacher / admin — confirm or dismiss; does not touch score |

Monitoring resolves from `ClassTest` for the assigned test; personal practice (no `ClassTest`) → monitoring off.

**UI:**

- Pretest gate records grant or refuse before start (Phase 1 allows either; both are persisted).
- Monitored quiz taker listens for `visibilitychange` / blur, records `hint` with debounce, polite Vietnamese banner — no score void.
- Teacher flag review panel (`components/teacher/anticheat-flags-panel.tsx`) on student/result views.

### Phase 2 — whole-monitor capture + Supabase evidence

**Client capture** (consent `granted` only):

1. `getDisplayMedia` ~1280×720 @ 1fps, `audio: false`.
2. Require `displaySurface === "monitor"`; otherwise stop stream, show Vietnamese `monitor_required` error, do not start the loop.
3. ~1fps loop → pHash / HSV / `TriggerEvaluator`; rolling hash window ≤16 samples.
4. Deciding frame triggers upload JPEG evidence via `uploadAnticheatEvidenceAction`; soft hints still use `recordFlagAction`.
5. On submit / unmount: stop tracks, clear intervals.

Modules: `lib/anticheat/display-surface.ts`, `capture-loop.ts`, `components/quiz/anticheat-capture.ts`. Unit tests inject stubs — never open a real picker in CI.

**Storage + retention:**

- Bucket: `anticheat-evidence` (override `ANTICHEAT_EVIDENCE_BUCKET`)
- Path scheme: `{submissionId}/{flagId}.jpg` (UUIDs only)
- Private bucket; client never uploads — service role only
- Max JPEG ~768 KiB decoded
- Cap ~20 flags/evidence per submission
- Admin cleanup: `cleanupAnticheatEvidenceAction` (30-day retention)
- Ops SQL checklist: `prisma/sql/003_anticheat_evidence_retention.sql`

### Phase 3 — polish

- Unproctored reasons: refuse → `refused_monitoring`; technical / monitor-share failure can continue unproctored; teacher can set `accommodation` / `technical_issue` without changing score.
- Chromium-first disclaimer on monitored pretest (informational; no UA hard-block).
- Offline Vitest coverage for `lib/supabase/anticheat-storage` helpers.

## Non-goals

These remain out of scope for the shipped phases:

- Live flag SSE / realtime teacher dashboards
- Multimonitor capture
- Server-side re-verification of client hashes
- Auto-fail, auto-void, or any score mutation from triggers
- Replacing teacher judgment with automated cheating verdicts

## Key modules

| Path | Purpose |
|---|---|
| `lib/anticheat/` | Math, triggers, display-surface helpers, capture loop |
| `lib/supabase/anticheat-storage.ts` | Storage upload / remove helpers |
| `app/actions/anticheat.ts` | Consent, flags, upload, review, cleanup, unproctored helpers |
| `components/quiz/quiz-pretest-gate.tsx` | Consent + browser disclaimer |
| `components/quiz/quiz-taker.tsx` / `anticheat-capture.ts` | Hint + capture wiring |
| `components/teacher/anticheat-flags-panel.tsx` | Review + unproctored labels |
| `prisma/schema.prisma` + `prisma/sql/003_anticheat_evidence_retention.sql` | Models and retention notes |

## Operations notes

### Enable monitoring

Teachers toggle `monitoringEnabled` when creating/editing a class assignment (test bank / class-test flows). Practice tests without a `ClassTest` row stay unmonitored.

### Bucket setup

1. Create private Storage bucket `anticheat-evidence` (or set `ANTICHEAT_EVIDENCE_BUCKET`).
2. Prefer file size limit ~786432 and MIME `image/jpeg`.
3. Deny anon/authenticated object access; rely on service role for upload/delete.
4. Ensure `SUPABASE_SERVICE_ROLE_KEY` is available to the app server (never expose to the client).

### Retention (30 days)

Prefer the admin-callable action `cleanupAnticheatEvidenceAction`, which removes Storage objects and corresponding evidence rows older than 30 days (by evidence `clientAt`). The SQL file documents preview/delete queries for DB-only purge if Storage was cleaned separately. Flags may remain without evidence; review and score fields are never auto-changed.

### Authz summary

| Operation | Who |
|---|---|
| Consent / flags / evidence upload | Owning student; upload requires consent `granted` |
| Flag review / unproctored reason (teacher) | Class teacher or admin |
| Evidence cleanup | Admin (or equivalent cron-safe caller) |

### Failure modes operators should know

- Missing service role / bucket → uploads fail; hint-only flags may still record.
- Student refuses monitoring or fails whole-monitor share → unproctored path; no capture loop.
- `evidence_capped` → further evidence uploads soft-stop for that submission.
