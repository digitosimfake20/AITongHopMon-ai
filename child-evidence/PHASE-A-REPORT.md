# Phase A report — Teacher adaptive / students / assignments loaders

**Branch:** `thetommylong/fix-teacher-loaders`  
**Date:** 2026-11-04  
**Scope:** A1 + A2 + A3 (this worktree only; no push/PR)

## What changed

### A1 Adaptive (`/teacher/adaptive`)
- Added `lib/quiz/adaptive-list-queries.ts`: slim list via `_count` of completed adaptive sessions (no session row payload); class-scoped `cachedQuery` tagged `adaptive` + `submissions`.
- `listAdaptiveAssignmentsAction` auth-gates then delegates to the cached loader.
- Page streams a Suspense skeleton while list data loads; deep progress remains on `/teacher/adaptive/[classTestId]`.

### A2 Students (`/teacher/students`)
- `getStudentsForClass` slimmed (`select` only list fields) and cached (`students` + `submissions`, TTL 90s).
- Page Suspense shell; per-student (and filter) Links use `prefetch={false}` (Phase C fold for row links only — sidebar untouched).

### A3 Assignments (`/teacher/assignments`)
- `getQuizPackagesForClass` no longer selects `questionIds` JSON for list; question counts come from `jsonb_array_length` (edit path still uses `getQuizPackageForEdit`).
- Package list wrapped in Suspense; create form (`QuizEditor`) stays outside the data boundary.
- Existing packages cache tags unchanged; gaps `?quiz=` banner still uses `getQuizPackagesForClass`.

## Risks
- Stale completion / roster stats until tag bust or soft TTL (90s) — assign/submit/roster paths already bust `adaptive` / `submissions` / `students`.
- Filtered Prisma `_count` on `adaptiveSessions` must match prior “round2 completed” semantics.
- Gaps banner still loads full package list when `?quiz=` present (Phase G backlog).

## Verify notes
- Teacher profile `03183047-c3c1-4f01-b79b-36f32a7329ce`, class 9A2: soft/hard nav on adaptive, students, assignments; confirm counts vs pre-change; confirm student detail `_rsc` prefetch storm drops after list settle.
- Spot-check gaps with `?quiz=<packageId>` still resolves titles.

## Timing (post-fix medians)

**Blocked — not measured in this worktree.**

| | |
|---|---|
| **Reason** | No `.env` / `.env.local` here; cannot run the app against production DB or take ≥5 local samples. Parent still resolving post-fix median path. |
| **Prod baseline (Phase 0 / teacher browser, single samples)** | Adaptive soft `_rsc` **5063 ms** / hard **8570 ms**; Students soft **4591 ms**; Assignments soft **3572 ms** (`TEACHER-BROWSER.md` / remediation plan). |
| **Post-fix** | Not claimed. Re-measure after deploy or when env/preview is available (≥5 samples → median). |
