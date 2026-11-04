# Phase F2 — Quiz-take query merge + KaTeX defer

**Branch:** `thetommylong/fix-quiz-take`  
**Worktree:** Orca child `fix-quiz-take`  
**Base URL (prod reference):** https://aitonghopmon-ai.vercel.app  

## Changes

| Area | What |
|---|---|
| **`getQuizForTaking`** | After `test.findUnique` (slim `select`), one `$transaction` loads membership + `classTest`(+ adaptive session) + questions + attempt count. Was 3–5 serial RTTs (membership → classTest → optional count → questions+count). Authz for window / maxAttempts / adaptive round gates unchanged — still evaluated in memory after the batch. |
| **`math-text.tsx`** | Re-applied Phase D (`d122131`) Vietnamese diacritic guard so `$…$` prose stays out of KaTeX. Safe math segments load `katex` CSS + `react-katex` only after `useInView` (once, `rootMargin: 240px`). No parallel heuristic in `quiz-taker`. |
| **`quiz-take-client.tsx`** | `next/dynamic` + `ssr: false` for `QuizTaker` so the intro gate (“Sẵn sàng làm bài”) does not pull the quiz-taker / MathText graph until `?start=1` / `?resume=1`. |
| **`page.tsx`** | Remains thin RSC (session + merged loader); comment documents the 2-RTT + deferred-KaTeX contract. |
| **`quiz-taker.tsx`** | No logic change — still imports shared `MathText` (defer lives in MathText). |

## Authz contract (must stay correct)

| Case | Behavior |
|---|---|
| Not a class member | `null` → AccessBlockedPage |
| ClassTest outside `[startTime, endTime]` | `null` |
| Standard ClassTest at `maxAttempts` | `null` (uses batched `prevSubmissions`) |
| Adaptive round 1 after round1 submitted | `null` |
| Adaptive round 2 without round1 / wrong test / round2 done | `null` |
| Teacher-created test (no ClassTest) | Membership only; questions + attempt count returned |

## SHAs

| Commit | Summary |
|---|---|
| `27bf6ebc85ce2c2abed8c1443b4ac9db2aa94413` | perf(quiz-take): merge take queries and defer KaTeX |
| `025c81c2853980f8a0b72382ef708c32c26702ff` | docs: add Phase F2 quiz-take report |
| `3fd332cb516ee300f0cb6a64a34b7f9ca0895ccd` | docs: record Phase F2 report SHA |

## Verify / Navigation Timing

**Status:** **BLOCKED** — no `.env` / `.env.local` in this worktree.

**Blocked reason:** Cannot run local/preview Navigation Timing or bundle analysis against a live DB/session. Must not invent credentials. Timing production (`aitonghopmon-ai.vercel.app`) would measure the *pre-fix* deploy, not these SHAs.

**Phase 0 reference (pre-fix intro):** quiz-take intro FCP ~4.8 s (bottleneck analysis).

**How parent should verify later (with env or preview deploy):**

1. Student open `/quiz/take/[testId]` intro — confirm gate paints without waiting on katex chunk; soft-nav / hard-nav FCP vs ~4.8 s baseline.
2. `?start=1` — questions render; math appears after scroll/in-view (brief plain-text flash acceptable).
3. Authz smoke: expired ClassTest, maxAttempts exhausted, adaptive wrong-round link → AccessBlockedPage.
4. Optional: Network tab — katex CSS/JS absent on intro; present after start when a safe `$…$` stem is visible.

## Tests

- `pnpm test` — 54 passed (12 files), including new `components/quiz/math-text.test.ts` for `isSafeMathInterior`.

## Risks

1. **Math flicker** — visible safe-math stems show plain interior until the dynamic chunk mounts.
2. **Denied path still fetches questions** — access-fail responses pay the questions query inside the batch (trades rare deny cost for fewer success RTTs).
3. **IntersectionObserver** — very old browsers without IO never promote KaTeX; stems stay plain (acceptable; app already uses `useInView` elsewhere).

## Left / follow-ups

1. Collect ≥5-sample intro + start Navigation Timing / transfer size once `.env` or a branch preview exists.
2. Parent merge: rebase with Phase D `math-text` if both land — this branch already includes D’s Vietnamese guard + F2 defer.
