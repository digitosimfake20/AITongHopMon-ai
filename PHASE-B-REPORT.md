# Phase B — Student shell first paint + React #418

**Branch:** `thetommylong/fix-student-shell`  
**Worktree:** Orca child `fix-student-shell`  
**Base URL (prod reference):** https://aitonghopmon-ai.vercel.app  
**Student profile:** `4d2a68b3-225f-4baa-b24e-faaa6dd92942` (not mutated)

## Changes

| Area | What |
|---|---|
| **#418 greeting** | Root cause: `DashboardGreeting` called `new Date().getHours()` during SSR of a client island. Vercel SSR uses UTC; browser uses local (VN) → text mismatch on most hours, on every student shell route. Fix: compute greeting once on the server via `formatStudentGreeting` / `Asia/Ho_Chi_Minh`, pass stable string prop; client only chooses `h1` vs `p`. |
| **Relative / locale** | `zenoUpdatedAt` remains a **server-only** relative string (not recomputed on client). Assignment deadlines format with explicit `timeZone: Asia/Ho_Chi_Minh`. No blanket `suppressHydrationWarning`. |
| **Streaming shell** | `app/(student)/layout.tsx` no longer awaits context before rendering children. Sidebar / mobile nav / header are independent `Suspense` slots; `children` stream in parallel. |
| **Deferred islands** | `ZenoChatLazy` kept; `ActiveQuizBanner` moved behind `ActiveQuizBannerLazy` (`dynamic`, `ssr: false`). |
| **Slim dashboard assignments** | `getStudentDashboardData` no longer calls full `getQuizBankForStudent`. New `getDashboardAssignments` loads ClassTests + adaptive groups only (skips practice catalog / `questionIds`). Quizzes page still uses full bank. |
| **Context overlap** | `resolveStudentContext` overlaps `getStudentShellStats` with class-id resolution. |
| **Phase C** | Did **not** rewrite `dashboard-sidebar.tsx` prefetch. |

## #418 root cause (localized)

**Mechanism:** Client component SSR of time-of-day greeting using runtime-local `Date#getHours()`.

**Evidence alignment:** `STUDENT-BROWSER.md` showed #418 on `/dashboard`, `/quizzes`, `/adaptive`, `/roadmap`, `/chat` (shared layout header) and not on marketing `/` — matches greeting in shell chrome.

**Not the primary cause:** class label (DB string), relative Zeno stamp (server string prop), ThemeToggle (already mount-gated).

## SHAs

| Commit | Summary |
|---|---|
| `345e9583ddafe935eea5efd61968e1d228bf88f5` | perf(student): stream shell, fix #418 greeting, slim dash assignments |
| `8035ee251209ab837e2b95176aa724920020f12f` | docs: record Phase B implementation SHA in report |
| `abe8259a9355379761b26f7b55e955ffcb72e78f` | docs: list both Phase B SHAs in report |
| _(this commit)_ | docs: mark post-fix medians blocked in Phase B report |

## Navigation Timing (≥5-sample medians)

**Status:** **BLOCKED** — deferred by coordinator.

**Blocked reason:** This worktree has no `.env` / `.env.local`. Cannot run a local/preview app against these commits. Must not invent credentials. Timing these SHAs against production (`aitonghopmon-ai.vercel.app`) would measure the *pre-fix* deploy, not this branch — so post-fix medians are deferred.

Prod baseline (pre-fix, from `app-bottleneck-analysis/child-evidence/STUDENT-BROWSER.md`) remains the only measured reference:

| Route | Doc TTFB | DCL | FCP / load | Source |
|---|---:|---:|---:|---|
| `/dashboard` (cold-ish) | 34 ms | 16062 ms | 16376 ms | STUDENT-BROWSER.md |
| `/dashboard` (remeasure) | 40 ms | 3189 ms | FCP 3060 ms | STUDENT-BROWSER.md |
| `/quizzes` | 35 ms | 4430 ms | FCP 4488 ms | STUDENT-BROWSER.md |
| `/adaptive` | 34 ms | 6196 ms | FCP 6260 ms | STUDENT-BROWSER.md |
| `/roadmap` | 35 ms | 5142 ms | FCP 5212 ms | STUDENT-BROWSER.md |

Post-fix ≥5-sample medians: **not collected** (blocked as above).

## Tests

- `pnpm test` — 53 passed (includes new `lib/dashboard/greeting.test.ts`).

## Left / follow-ups

1. Collect post-fix Navigation Timing (≥5 samples) when `.env` or a branch preview exists — do not attribute prod timings to these SHAs.
2. Console check for zero #418 on student shell routes after deploy/preview.
3. Phase C prefetch on `dashboard-sidebar.tsx` (untouched here).
