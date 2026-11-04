# Mathz / AITongHopMon-ai — bottleneck analysis (read-only)

**Date:** 2026-11-04  
**Base URL:** https://aitonghopmon-ai.vercel.app  
**Parent dispatch:** `ctx_497681b591ac` · task `task_c32d2097c804`  
**Constraint:** Analysis only — no product code fixes, refactors, or dependency bumps.

## Children / evidence sources

| Child | Dispatch | Worktree | Outcome | Report |
|---|---|---|---|---|
| code-hotspots | `ctx_cc0e26ebfcf7` | `.../code-hotspots` | succeeded | `CODE-HOTSPOTS.md` |
| browser-student | `ctx_d5f03978b14b` | `.../browser-student` | succeeded | `STUDENT-BROWSER.md` + `browser-evidence/*.png` |
| browser-teacher | `ctx_d5781635e5d9` | `.../browser-teacher` | succeeded | `TEACHER-BROWSER.md` |

## Sessions / profiles

| Profile | Id | Result |
|---|---|---|
| student | `4d2a68b3-225f-4baa-b24e-faaa6dd92942` | Worked (Nguyễn · Lớp 9A2) |
| teacher | `03183047-c3c1-4f01-b79b-36f32a7329ce` | Initially `/login`; restored by coordinator; then authenticated journeys OK |

---

## Ranked findings (merged)

### 1. Teacher adaptive + students RSC: multi-second streams for tiny payloads — **P0 / Critical**

| | |
|---|---|
| **Symptom** | `/teacher/adaptive` and `/teacher/students` feel blank for many seconds; soft nav wall ~5–6 s |
| **Likely location** | Adaptive list / progress loaders under `app/teacher/adaptive`; student list `lib/quiz/teacher-student-queries.ts` (`getStudentsForClass` / related); teacher chrome Links |
| **Evidence** | Teacher browser: adaptive soft `_rsc` **5063 ms** / ~2 KB (stream ≈4714 ms); hard nav **8570 ms**. Students soft `_rsc` **4591 ms** / ~5 KB. Pattern: HTML TTFB ~30–50 ms, response/stream window multi-second. Assignments soft `_rsc` **3572 ms**. |
| **Severity** | **P0** |
| **Suggested fix** | Server-profile those loaders; Suspense shell first; cache class-scoped adaptive/assignment summaries; slim list queries; cut Link prefetch on secondary rows. |

### 2. Class gap-map multi-round SQL waterfall — **P0** (code; runtime medium today)

| | |
|---|---|
| **Symptom** | Gap map scales poorly with class × submissions; cold/invalidated path expensive |
| **Likely location** | `lib/quiz/class-gap-map.ts` → `getClassGapMapDataUncached`; `app/teacher/gaps/page.tsx` |
| **Evidence** | Code: serial classroom → multiple raw SQL aggs → question/user/test finds; null-cache double-runs uncached. Browser (class 9A2, 22 HS): soft `_rsc` **2572 ms** / ~5 KB (better than adaptive but still multi-second). KaTeX Vietnamese `ờ` console spam on gaps. |
| **Severity** | **P0** (scale / cold) · observed latency **P1–P2** on this class size |
| **Suggested fix** | 1–2 SQL CTEs / rollups; `Promise.all` where PgBouncer-safe; fix null-cache re-entry; keep Vietnamese prose out of KaTeX math mode. |

### 3. Student shell: ~35 ms TTFB but 3–16 s first paint + React #418 — **P0 / High**

| | |
|---|---|
| **Symptom** | Logged-in student pages feel multi-second blank; hydration mismatches |
| **Likely location** | `app/(student)/layout` + `lib/dashboard/context.ts` / `student-data.ts`; client bits that diverge from SSR (greeting/time/locale) |
| **Evidence** | Student browser Navigation Timing: `/dashboard` cold DCL **16062 ms** / remeasure FCP **~3 s**; `/adaptive` FCP **6260 ms**; `/quizzes` **4488 ms**; `/roadmap` **5212 ms**. Console React **#418** on dashboard/quizzes/adaptive/roadmap/chat. Marketing `/` fast (FCP ~228 ms). Screenshots under child `browser-evidence/`. |
| **Severity** | **P0** (UX) |
| **Suggested fix** | Attribute DCL≫responseEnd (hydration / main-thread); stabilize SSR text; reduce layout JS; stream shell; defer chat/map clients. |

### 4. RSC prefetch storm (student + teacher chrome) — **P1 / High**

| | |
|---|---|
| **Symptom** | Every page fires many sibling `_rsc` GETs (teacher 27–33; student peers 300–1600 ms each) |
| **Likely location** | Sidebar / nav `<Link>` defaults; student row links; query-string variants (`class=`, `mode=`, `filter=`) |
| **Evidence** | Teacher: prefetch_count **27–33** per soft nav; duplicate flights for same paths with/without query. Student: `/chat?_rsc` **1647 ms**, many 300–560 ms peers after dashboard. |
| **Severity** | **P1** (contends with primary RSC; burns serverless) |
| **Suggested fix** | `prefetch={false}` or hover/viewport prefetch; avoid mounting many alternate-query Links on first paint; do not prefetch heavy quiz-take from overview. |

### 5. Post-submit AI pipeline sequential DB + LLM — **P0** (code; not fully exercised in browser)

| | |
|---|---|
| **Symptom** | After submit, BKT / cognitive profile / `aiFeedbackSummary` lag; `after()` duration risk |
| **Likely location** | `lib/ai/pipeline.ts` `runPostSubmissionAIPipeline`; `app/actions/quiz-submission.ts`; `lib/knowledge/topic-canonicalize-ai.ts` |
| **Evidence** | Code: ≈3 serial RTT × N topics; optional LLM; serial canonical persist. Browser: quiz take intro only — no full submit measured. |
| **Severity** | **P0** (freshness / timeout) |
| **Suggested fix** | Batch upserts; fewer round-trips; keep LLM off critical path / fire-and-forget. |

### 6. Zeno chat non-streaming + unbounded history — **P1**

| | |
|---|---|
| **Likely location** | `app/actions/chat-zeno.ts`; `components/chat/zeno-chat-modal.tsx` |
| **Evidence** | Code: blocking `chat.completions.create`, unbounded `findMany` + decrypt. Browser: `/chat` load FCP ~3.4 s; no paid turns exercised. |
| **Severity** | **P1** |
| **Suggested fix** | Stream tokens; cap history; incremental decrypt. |

### 7. Quiz take auth/DB waterfall + KaTeX on critical client — **P1**

| | |
|---|---|
| **Likely location** | `getQuizForTaking` in `lib/quiz/quiz-bank-queries.ts`; `components/quiz/math-text.tsx` |
| **Evidence** | Code: serial access checks then transaction. Browser intro: FCP **~4.8 s**. Teacher gaps KaTeX Unicode warnings. |
| **Severity** | **P1** |
| **Suggested fix** | Merge access+questions query; dynamic-import KaTeX / visible-only render. |

### 8. Result re-analyze multi-LLM + practice bank JSON scan — **P1**

| | |
|---|---|
| **Likely location** | `app/actions/analyze-submission.ts`; `lib/system-test/mix-practice-from-bank.ts` (up to 80 full JSON rows) |
| **Evidence** | Static call graphs only (no browser re-analyze / smart-quiz timing). |
| **Severity** | **P1** |
| **Suggested fix** | Prefer cached pipeline plan; DB-side topic filter; smaller candidate set. |

### 9. Secondary code hotspots — **P2–P3**

- Student shell/dashboard deep context + full quiz bank on dashboard (`lib/dashboard/*`) — **P2**; amplified by runtime #3.  
- Package edit N question fetches (`getQuizPackageForEdit`) — **P2**.  
- Teacher student detail unbounded submissions — **P2**.  
- Gap `?quiz=` banner full package list — **P3**.  
- Roadmap unbounded knowledge states — **P3**.  
- Landing ignores active student session — UX **P3** (screenshot evidence).

---

## Cross-cutting pattern

Across student and teacher production runs: **document TTFB is low (~30–50 ms) while DCL / RSC stream completion is multi-second for small bodies (~2–12 KB)**. Bottleneck is server work + hydration/client work + prefetch contention, not large downloads.

## Residual unknowns

- No `EXPLAIN ANALYZE`, Vercel APM, Lighthouse, or `next build` bundle analyzer in this pass.  
- Full quiz submit / Zeno chat turns / result “Phân tích” not timed in browser.  
- Teacher screenshots failed CDP paint timeout (timing/console only).  
- React #418 source file not pinned (minified production).  
- Whether `unstable_cache` hits consistently on multi-instance Vercel for gap-map.

## Cleanup

Parent will release settled child terminals and remove unused child worktrees after this report is written (reports live in those worktrees; this file is the coordinator-facing synthesis).

## Suggested fix order (direction only — do not implement here)

1. Teacher adaptive + students loader profiling / Suspense / cache  
2. Student shell hydration (#418) + JS weight / streaming  
3. Prefetch storm (teacher + student nav)  
4. Gap-map SQL consolidation  
5. Post-submit pipeline batching  
6. Chat streaming + quiz-take KaTeX defer + practice bank indexing  
