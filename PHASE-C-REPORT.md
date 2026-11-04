# Phase C report — RSC prefetch storm

**Branch:** `thetommylong/fix-prefetch`  
**Worktree:** Orca child `fix-prefetch`  
**Date:** 2026-11-04  
**Base:** parent tip with Phase A+B (`e37f4fc` / `db66c8d` + `20d0ea3`)  
**Scope:** Link prefetch discipline only (no loader/SQL/AI pipeline edits)

## SHAs

| Commit | Summary |
|---|---|
| `d0e56adc46ffaa608312bf675eaef613f8f0cf81` | perf(nav): disable RSC prefetch storm on secondary Links |
| _(this docs commit)_ | docs: Phase C report with blocked post-fix medians |

## What changed

### Teacher + student shell nav
- `TeacherNavLinks` / `DashboardNavLinks`: every nav item uses `prefetch={false}`; overview (`id === 'overview'`) also hover-prefetches via `router.prefetch`.
- Sidebars + mobile navs: `prefetch={false}` on secondary “Danh sách lớp” `/onboarding` Links.
- Teacher/student headers: disable auto-prefetch on chrome CTAs (`/onboarding`, `/teacher/assignments`).

### First-paint query variants
- Teacher overview: `?mode=adaptive|quick-test`, `?filter=at-risk`, per-row `?quiz=` gaps links → `prefetch={false}`.
- Student overview: `/adaptive?topic=…`, hero `/adaptive` CTA → `prefetch={false}`.

### Never prefetch `/quiz/take/[id]` from overview lists
- Dashboard `AssignmentsCard`, `QuizCard` (standard + adaptive), adaptive recent-tests list, and `ActiveQuizBanner` resume links all set `prefetch={false}` on take/result Links.

### Left untouched (by design)
- Phase A students-row `prefetch={false}` already on parent tip.
- Loader/SQL/AI pipeline files (Phases A/D/E).
- Quiz-take gate / in-flow start Links (not overview list storm).

## Peer-count notes (expected)

Pre-fix Phase 0 soft-nav peer `_rsc` medians (prod):

| Surface | Route | median peers |
|---|---|---:|
| Teacher | `/teacher` soft | **6** (raw up to 26) |
| Teacher | `/teacher/adaptive` soft | **9** (raw up to 32) |
| Student | `/adaptive` soft | **11** |
| Student | `/dashboard` / `/quizzes` soft | **1** (spikes to 8–10) |

After this change, default viewport prefetch of the full sidebar + query-variant / quiz-take Links should stop. Soft-nav peer counts should collapse toward the primary `_rsc` only (teacher prefetch_count ≪ 27; student dashboard should not fire multi heavy peers immediately). Exact post-fix peer counts require a deploy/preview of these SHAs.

## Timing (≥5-sample medians)

**Status:** **BLOCKED**

| | |
|---|---|
| **Reason** | No `.env` / `.env.local` in this worktree; cannot run local/preview against these commits. Must not invent credentials. Measuring production (`aitonghopmon-ai.vercel.app`) would attribute **pre-fix** timings to this branch. |
| **Pre-fix baseline** | Cite `PHASE0-BASELINE.md` / parent `child-evidence/PHASE0-BASELINE.md` (teacher soft peers high on `/teacher` + `/teacher/adaptive`; student soft peers high on `/adaptive`). |
| **Post-fix** | Not claimed. Re-measure after deploy or when env/preview is available (≥5 samples → median peer_count + primary `_rsc`). |

## Left / follow-ups

1. Collect ≥5 soft-nav peer_count + primary `_rsc` medians on teacher overview/adaptive and student dashboard/adaptive after preview/deploy.
2. Optionally extend hover-prefetch to a small primary set beyond overview if cold secondary nav feels too slow.
3. Parent merge; no push/PR from this child unless requested.
