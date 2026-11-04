# Bottleneck remediation plan

**Source:** `BOTTLENECK-ANALYSIS.md` + `child-evidence/{CODE-HOTSPOTS,STUDENT-BROWSER,TEACHER-BROWSER}.md`  
**App:** https://aitonghopmon-ai.vercel.app  
**Date:** 2026-11-04  

## Execution progress (parent `task_569a379eadac` / `ctx_0fabc488026b`)

| Wave | Child | Dispatch | Worktree | Status |
|---|---|---|---|---|
| 0 | phase0-baseline | `ctx_386757e47ce0` | `.../phase0-baseline` | **succeeded** — see `PHASE0-BASELINE.md` / `child-evidence/PHASE0-BASELINE.md`; worktree cleaned |
| 1A | fix-teacher-loaders | `ctx_227ba92828be` | `.../fix-teacher-loaders` | **succeeded** — child `84bce80`; merged to parent as `db66c8d`; post-fix medians blocked (no .env) |
| 1B | fix-student-shell | `ctx_e360a72743f3` | `.../fix-student-shell` | **succeeded** — impl `345e958`→parent `20d0ea3`; #418 = client `Date#getHours()` vs VN server greeting; medians blocked; worktree cleaned |
| 2 | fix-prefetch (C) | `ctx_af533e7ecc44` | `.../fix-prefetch` | **succeeded** — child `d0e56ad` merged; medians blocked; worktree cleaned |
| 3D | fix-gap-map (D) | `ctx_43bd4d85a8cb` | `.../fix-gap-map` | **succeeded** — child `28f64ea`→parent `d122131`; medians blocked; worktree cleaned |
| 3E | fix-ai-pipeline (E) | `ctx_3bc35cb072a1` | `.../fix-ai-pipeline` | **succeeded** — child `ffbb54b`→parent `6b6e221`; submit timing blocked; worktree cleaned |
| 4F1 | fix-zeno-stream | `ctx_f1e8c15082a7` | `.../fix-zeno-stream` | **succeeded** — `0c83981`→parent `e7d5089`; TTFT blocked; cleaned |
| 4F2 | fix-quiz-take | `ctx_c928dd8b1e0d` | `.../fix-quiz-take` | **succeeded** — `27bf6eb`→parent `024c71d` (math-text conflict resolved keeping VN+defer); cleaned |
| 4F3 | fix-practice-analyze | `ctx_24b560018ade` | `.../fix-practice-analyze` | **succeeded** — `4b0519f`/`66276e2`→parent `b5cbb82`/`fa83b52`; timing blocked; worktree cleaned |
| 5G | Phase G backlog | — | — | deferred |

**Verify note:** post-fix medians vs production still blocked without deploy/.env; children commit + report; cite Phase 0 prod medians as pre-fix baseline.

---

**Original constraint (planning pass):** plan-only. Implementation is now underway via child worktrees above.

Cross-cutting observation to keep in every phase: production runs showed **~30–50 ms document TTFB** with **multi-second DCL / RSC stream completion** for **tiny (~2–12 KB) bodies**. Prefer server-work reduction, Suspense shells, hydration correctness, and prefetch discipline over “compress HTML.”

---

## Honesty / residual unknowns (carry into every verification plan)

| Gap | Impact on plan |
|---|---|
| No `EXPLAIN ANALYZE`, Vercel APM, Lighthouse, or bundle analyzer yet | Phase 0 baselines first; SQL/index work may need a short measurement spike before large rewrites |
| Full quiz submit, Zeno chat turns, result “Phân tích” not timed in browser | Pipeline / chat / re-analyze severity is **code-shaped**; verify with timed flows before claiming win |
| React #418 source not pinned (minified prod) | Student shell phase starts with mismatch localization |
| Teacher CDP screenshots timed out | Prefer Navigation Timing + `_rsc` Resource Timing + console over screenshots for teacher gates |
| `unstable_cache` hit rate on multi-instance Vercel unknown | Gap-map cold-path work still required even if warm path looks OK |

**Recommended Phase 0 (measurement, parallel-safe):** establish a short baseline script/checklist on student + teacher profiles (same routes as analysis) and optionally add temporary server timing logs / `EXPLAIN` on gap-map SQL. This is not a product feature fix; it unblocks confidence for Phases A–F. Can run as its own Orca Cursor worktree while Phase A starts if the team accepts “fix under measurement.”

---

## Dependency map

```text
Phase 0  measurement baseline ──────────────────────────────┐
                                                            │
Phase A  teacher adaptive/students/assignments loaders      │  (independent of student shell)
         │                                                  │
         ├─► benefits from Phase C (prefetch) but can ship first
         │
Phase B  student shell hydration + JS / streaming ──────────┤
         │                                                  │
         └─► Phase C prefetch (student) amplifies B wins    │
                                                            │
Phase C  prefetch storm (teacher + student) ◄───────────────┘
         │   Can start in parallel with A/B with care:
         │   - Teacher nav Links ≠ adaptive loader internals
         │   - Student sidebar Links ≠ #418 root cause
         │   Merge conflicts likely in shared sidebars if both edit same files
         │
Phase D  gap-map SQL consolidation
         │   Independent of A at code level, but same teacher class UX;
         │   share cache-invalidation rules with submit pipeline (Phase E)
         │
Phase E  post-submit AI pipeline batching
         │   Invalidates gap/dashboard caches; coordinate tags with D
         │
Phase F  chat stream + quiz-take KaTeX + practice bank + re-analyze
         Mostly independent of A–E; quiz-take KaTeX may touch shared math-text used by gaps
```

**Do not** treat prefetch alone as the fix for adaptive 5–8 s streams: tiny `_rsc` bodies already prove download is not the issue; prefetch mainly reduces *contention* and wasted serverless.

---

## Phase A — P0: Teacher adaptive / students / assignments loaders

**Goal:** Cut soft `_rsc` / hard nav wall from ~5–8.5 s toward &lt;1.5 s p75 for class-sized data (≈22 students) without bloating payloads.

### A1. Adaptive assignment list
| | |
|---|---|
| **Problem** | Soft `_rsc` **5063 ms** / ~2 KB; hard nav **8570 ms** on `/teacher/adaptive` |
| **Targets** | `app/teacher/adaptive/page.tsx`; `listAdaptiveAssignmentsAction` in `app/actions/test-group`; `components/teacher/teacher-adaptive-list-client.tsx`; any progress aggregates pulled inside the action |
| **Approach** | (1) Profile which queries dominate. (2) Split page into Suspense shell (chrome + skeleton) vs data. (3) Slim list DTO (ids, titles, status counts only). (4) Cache class-scoped adaptive summary with existing `lib/cache/*` tags; invalidate on assign/submit. (5) Defer per-assignment deep progress to detail route `app/teacher/adaptive/[classTestId]/page.tsx` / `getAdaptiveSummaryAction`. |
| **Risks** | Stale progress after submit if tags wrong; PgBouncer + wide `Promise.all`; client assuming full payload shape. |
| **Verify** | Teacher profile: soft nav to `/teacher/adaptive?class=…` — primary `_rsc` duration + wall; hard reload Navigation Timing; correctness of counts vs pre-change. Target: soft `_rsc` &lt; ~1.5 s on 9A2-sized class. |
| **Worktree** | **Own Cursor worktree** `fix-teacher-adaptive`. Blocks lightly on Phase C only for final polish. |

### A2. Students list
| | |
|---|---|
| **Problem** | Soft `_rsc` **4591 ms**; per-row student detail prefetch after load |
| **Targets** | `app/teacher/students/page.tsx`; `getStudentsForClass` in `lib/quiz/teacher-student-queries.ts`; student row `<Link>`s in list UI |
| **Approach** | Slim list query (already healthier than detail); drop heavy joins; `prefetch={false}` on per-student links (or viewport); paginate/virtualize if &gt;~40. Leave `getStudentDetail` unbounded history for Phase G. |
| **Risks** | UI regressions if cards expect fields removed from DTO. |
| **Verify** | Soft/hard timings on `/teacher/students?class=…`; count of follow-up `/teacher/students/<id>?_rsc=` after settle (should drop). |
| **Worktree** | Can share A1 worktree **or** parallel `fix-teacher-students` if different owners — low file overlap with adaptive action. |

### A3. Assignments list
| | |
|---|---|
| **Problem** | Soft `_rsc` **3572 ms** on `/teacher/assignments` |
| **Targets** | `app/teacher/assignments/page.tsx`; `getQuizPackagesForClass` in `lib/quiz/queries.ts` |
| **Approach** | Same pattern as A1: slim package list fields, Suspense, class-scoped cache. Avoid loading edit-path question sets (`getQuizPackageForEdit`) on list. |
| **Risks** | Shared `getQuizPackagesForClass` also used by gaps banner (`?quiz=`) — see D2 / Phase G. |
| **Verify** | Soft `_rsc` on assignments; spot-check gaps banner still resolves titles. |
| **Worktree** | Prefer same as A1/A2 if one owner; else parallel after A1 lands cache helpers. |

**Phase A parallelization:** A1 ∥ A2 feasible; A3 after or with shared cache helper PR to avoid duplicate TTL patterns.

---

## Phase B — P0: Student shell first paint + React #418

**Goal:** Logged-in student routes FCP/DCL from 3–16 s toward marketing-like interactivity (&lt;~1.5–2 s warm; cold &lt;~3 s), and **zero** React #418 on shell pages.

| | |
|---|---|
| **Problem** | ~35 ms TTFB but DCL/FCP multi-second; #418 on `/dashboard`, `/quizzes`, `/adaptive`, `/roadmap`, `/chat` |
| **Targets** | `app/(student)/layout.tsx`; `lib/dashboard/context.ts` (`resolveStudentContext`); `lib/dashboard/student-data.ts`; `lib/auth/session.ts` (`getSessionUser`); greeting/time widgets in dashboard components; `components/chat/zeno-chat-lazy.tsx` (already split — audit other layout imports); `components/dashboard/dashboard-sidebar.tsx` |
| **Approach** | (1) Localize #418: compare SSR HTML vs client first paint (greeting, relative dates, locale, class label). Stabilize with server-only strings or `suppressHydrationWarning` only where intentional (prefer fix root). (2) Stream shell via Suspense; keep layout lean. (3) Stop dashboard from pulling full `getQuizBankForStudent` if only assignments cards need a slim query. (4) Defer non-critical client islands. |
| **Risks** | Over-using `suppressHydrationWarning` masks bugs; thinning dashboard data changes empty states. |
| **Verify** | Student profile: Navigation Timing on same routes as `STUDENT-BROWSER.md`; console must show **no** #418; screenshots optional. Compare cold vs warm. |
| **Worktree** | **Own** `fix-student-shell`. **Coordinate with Phase C** if both edit `dashboard-sidebar.tsx`. |

**Depends on:** Phase 0 helpful for #418 attribution. **Independent of** Phase A.

---

## Phase C — P1: RSC prefetch storm (teacher + student)

**Goal:** Drop teacher `prefetch_count` from 27–33 to a small set of likely next hops; stop student peer `_rsc` bursts (esp. quiz-take / chat) from contending with primary navigation.

| | |
|---|---|
| **Problem** | Default Link prefetch + many query variants; student peers 300–1600 ms each |
| **Targets** | `components/teacher/teacher-sidebar.tsx`; `components/dashboard/dashboard-sidebar.tsx`; teacher students list row links; any Links with alternate `?class=` / `mode=` / `filter=` mounted on first paint |
| **Approach** | `prefetch={false}` on secondary nav; hover/viewport prefetch for primary; do not mount duplicate Links for every query variant; never prefetch `/quiz/take/[id]` from overview lists. |
| **Risks** | Slightly slower perceived nav to cold secondary routes (acceptable trade). Merge conflicts with Phase A/B sidebar edits. |
| **Verify** | After soft nav, count `text/x-component` / `_rsc` peers in Resource Timing / Orca network; teacher prefetch_count ≪ 27; student dashboard should not fire 4+ heavy peers immediately. Primary route timing should not regress. |
| **Worktree** | **Own** `fix-prefetch` **or** fold into A (teacher) + B (student) to avoid thrash. If separate, land **after** or carefully rebase on A/B sidebar changes. |

**Depends on:** None functionally. **Conflicts with:** A2 row links, B sidebar — sequence or one owner.

---

## Phase D — P0 (scale): Gap-map SQL consolidation (+ KaTeX noise)

**Goal:** Collapse cold/uncached gap-map path; keep warm path; remove Vietnamese KaTeX console spam.

### D1. SQL / cache
| | |
|---|---|
| **Problem** | Serial multi-query waterfall in `getClassGapMapDataUncached`; null-cache re-runs uncached; scales with class × details |
| **Targets** | `lib/quiz/class-gap-map.ts` (`getClassGapMapDataUncached`, `getClassGapMapData`); `app/teacher/gaps/page.tsx`; `lib/cache/*` TTL/tags; possibly `prisma/schema.prisma` indexes |
| **Approach** | (1) `EXPLAIN` hot SQL (Phase 0). (2) 1–2 CTEs / rollup table. (3) `Promise.all` only for independent queries under PgBouncer `connection_limit=1` constraints (batch carefully). (4) Fix `if (data) return data; return getClassGapMapDataUncached(...)` double-miss. (5) Align invalidation with submit (`invalidateAfterSubmit`). |
| **Risks** | Wrong aggregates; cache serving stale gaps after submit; connection pile-up. |
| **Verify** | Soft `_rsc` on `/teacher/gaps?class=…` (baseline ~2572 ms); cold vs warm; correctness spot-check critical gaps vs DB; after a submit, gaps refresh within expected TTL/tag. Optional EXPLAIN before/after. |
| **Worktree** | **Own** `fix-gap-map`. Independent of A loaders; **coordinate cache tags with Phase E**. |

### D2. KaTeX Vietnamese prose
| | |
|---|---|
| **Problem** | Console: unrecognized Unicode `ờ` / missing metrics on gaps |
| **Targets** | Gap UI components rendering labels through `components/quiz/math-text.tsx` / KaTeX |
| **Approach** | Keep Vietnamese outside math mode; only wrap TeX islands. |
| **Risks** | Over-escaping breaks legitimate formulas. |
| **Verify** | Gaps page console clean of KaTeX Unicode warnings. |
| **Worktree** | Can ship with D1 or tiny parallel `fix-katex-i18n` — **overlaps Phase F quiz-take KaTeX** if both touch `math-text.tsx` → one owner preferred. |

---

## Phase E — P0 (freshness / timeout): Post-submit AI pipeline

**Goal:** Reduce per-topic serial DB RTTs; keep LLM off the critical `after()` budget; preserve BKT correctness.

| | |
|---|---|
| **Problem** | ≈3 awaits × N topics; optional LLM; serial canonicalize persist; serverless duration risk |
| **Targets** | `lib/ai/pipeline.ts` (`runPostSubmissionAIPipeline`); `app/actions/quiz-submission.ts` (`after(...)`); `lib/knowledge/topic-canonicalize-ai.ts` (`ensureTopicsCanonicalized`, `persistCanonicalGroups`) |
| **Approach** | Batch upserts / fewer round-trips; skip redundant `findUnique` when upsert returns; parallelize only independent writes; deterministic plan on hot path, LLM enrich async; practice path already skips some LLM — keep that. |
| **Risks** | Race on knowledge state; incomplete feedback if async fails silently; cache invalidation storms with gap-map. |
| **Verify** | **Must add timing:** instrument pipeline duration in logs; browser full submit (not done in analysis) → result page feedback freshness; no Vercel timeout; BKT/topic counts match. |
| **Worktree** | **Own** `fix-ai-pipeline`. **After or with** D on cache tags. |

---

## Phase F — P1: Chat streaming, quiz-take, practice bank, re-analyze

These are largely independent; can be **three parallel Cursor worktrees** after A–E priorities, or sooner if staffing allows (except shared `math-text.tsx`).

### F1. Zeno chat streaming + history cap
| | |
|---|---|
| **Problem** | Blocking `chat.completions.create`; unbounded history decrypt |
| **Targets** | `app/actions/chat-zeno.ts` (`sendZenoMessageAction`, `getChatHistoryAction`); `components/chat/zeno-chat-modal.tsx` |
| **Approach** | SSE / AI SDK stream; `take` on history; incremental decrypt; lighter prompt for short turns. |
| **Risks** | Encryption/session sequence races; UX change for partial tokens. |
| **Verify** | Timed chat turn (TTFT + complete); history open on long session; no full-page wait. **Not measured yet — establish baseline first.** |
| **Worktree** | `fix-zeno-stream` |

### F2. Quiz-take query merge + KaTeX defer
| | |
|---|---|
| **Problem** | Serial access checks; KaTeX on critical client; intro FCP ~4.8 s |
| **Targets** | `getQuizForTaking` in `lib/quiz/quiz-bank-queries.ts`; `app/quiz/take/[testId]/page.tsx`; `components/quiz/quiz-taker.tsx`; `components/quiz/math-text.tsx` |
| **Approach** | Single join/transaction for access + questions + attempt count; dynamic import KaTeX / visible-only. |
| **Risks** | Authz bugs if access checks merged wrong; math flicker. |
| **Verify** | Quiz intro + start Navigation Timing / bundle weight; no access regressions for class/adaptive tests. |
| **Worktree** | `fix-quiz-take` — **coordinate `math-text` with D2** |

### F3. Practice bank indexing + result re-analyze
| | |
|---|---|
| **Problem** | Up to 80 `systemTest` JSON rows parsed in JS; re-analyze multi-LLM + per-question updates |
| **Targets** | `lib/system-test/mix-practice-from-bank.ts` (`collectPracticeQuestionsFromBank`); `app/actions/generate-smart-quiz.ts`; `app/actions/analyze-submission.ts`; `components/quiz/result/ai-insights-card.tsx` |
| **Approach** | Normalize/index `topicKey` at ingest; SQL/jsonb filter; smaller candidate set; prefer cached `aiFeedbackSummary` / pipeline plan; batch topic updates. |
| **Risks** | Migration for topic keys; analyze quality regression. |
| **Verify** | Timed smart-quiz generate + “Phân tích” click (**baselines missing**); DB query counts. |
| **Worktree** | `fix-practice-analyze` (or split if migration-heavy) |

---

## Phase G — P2–P3 backlog (after P0/P1)

| Item | Targets | Notes | Worktree |
|---|---|---|---|
| Package edit N+1 questions | `getQuizPackageForEdit` in `lib/quiz/queries.ts` | One `findMany` + partition | Small; parallel anytime |
| Teacher student detail unbounded submissions | `getStudentDetail` in `lib/quiz/teacher-student-queries.ts` | Paginate; after A2 | After A2 |
| Gaps `?quiz=` banner full package list | `app/teacher/gaps/page.tsx` | `findUnique` by id | With D or A3 |
| Roadmap unbounded knowledge states | `app/(student)/roadmap/page.tsx` | Cap/aggregate | After B |
| Landing ignores auth session | marketing `/` | Redirect or session-aware CTAs | Independent UX; low perf |
| Schema indexes for class analytics | `prisma/schema.prisma` | After EXPLAIN in D | With D |

---

## Suggested execution order (staffing)

| Wave | Work | Parallel? |
|---|---|---|
| **0** | Baseline timings + optional EXPLAIN / #418 localization | Yes, solo worktree |
| **1** | Phase A (teacher loaders) ∥ Phase B (student shell) | Yes — different surfaces |
| **2** | Phase C prefetch (or folded into wave 1 sidebars) | After or carefully with 1 |
| **3** | Phase D gap-map ∥ Phase E pipeline (share cache-tag design first) | Parallel after tag contract |
| **4** | Phase F1 ∥ F2 ∥ F3 | Yes |
| **5** | Phase G backlog | As capacity |

---

## Verification kit (reuse across PRs)

**Profiles (do not recreate):** student `4d2a68b3-225f-4baa-b24e-faaa6dd92942`, teacher `03183047-c3c1-4f01-b79b-36f32a7329ce`  
**Class exercised:** Lớp 9A2 (`4eb54d69-b919-47b3-bd8b-436a24736ded`)

**Teacher routes:** `/teacher`, `/teacher/adaptive`, `/teacher/students`, `/teacher/assignments`, `/teacher/gaps`, `/teacher/test-bank`  
**Student routes:** `/dashboard`, `/quizzes`, `/adaptive`, `/roadmap`, `/chat`, quiz-take intro  

**Metrics:** Navigation Timing (TTFB, DCL, FCP/load); primary `_rsc` duration + body size; prefetch peer count; console errors (#418, KaTeX); for AI paths — server duration logs + user-visible freshness.

**Success bar (initial):** teacher adaptive/students soft `_rsc` &lt; ~1.5–2 s on 9A2; student shell warm FCP &lt; ~2 s and no #418; prefetch peers sharply reduced; gap cold path improved with EXPLAIN evidence; pipeline duration down without correctness loss.

---

## Out of scope for this plan document

- Implementing any of the above  
- Push / PR creation  
- Dependency bumps unless a later implementation task explicitly requires them  
- Inventing credentials or recreating browser profiles  
