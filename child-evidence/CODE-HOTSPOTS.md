# Code / data path hotspots (read-only)

Static analysis of Mathz / AITongHopMon-ai in this worktree. **No product code was changed.** Severities: P0 = user-visible latency or scale risk on core paths; P1 = clear bottleneck; P2 = medium; P3 = polish / growth risk.

Stack context: Next.js 16 App Router, Prisma + Supabase pooler (`connection_limit=1`), OpenAI, BKT knowledge updates. Several loaders already use `unstable_cache` / tag busting (`lib/cache/*`).

---

## Ranked findings

### 1. Class knowledge gap map — multi-round heavy SQL waterfall
| | |
|---|---|
| **Severity** | **P0** |
| **Symptom** | `/teacher/gaps` (and legacy `/teacher/classes/[id]/gaps` redirect) can feel multi-second on cold cache / after submit invalidation; CPU + DB load grows with class size × submissions × details. |
| **Location** | `lib/quiz/class-gap-map.ts` → `getClassGapMapDataUncached` → `getClassGapMapData`; page `app/teacher/gaps/page.tsx` |
| **Evidence** | Uncached path is **serial**: classroom → topic agg raw SQL over `submission_details` → student×topic agg → alias lookup → wrong-question agg → `question.findMany` → wrong-student distinct SQL → `user.findMany` → `submission.groupBy` → another `user.findMany` → `test.findMany` → completion pair SQL. Joins repeatedly scan detail rows for the whole class. Soft TTL 300s (`CacheTTL.classGap`) helps, but on miss/null the function **re-runs uncached** (`if (data) return data; return getClassGapMapDataUncached(...)`). |
| **Fix direction** | Collapse into 1–2 SQL CTEs / materialized view; parallelize independent queries with `Promise.all` (respect PgBouncer); avoid double uncached run on null; consider pre-aggregating topic stats on submit. |

### 2. Post-submit AI pipeline — sequential per-topic DB + optional LLM
| | |
|---|---|
| **Severity** | **P0** (submit → feedback freshness / serverless duration) |
| **Symptom** | After quiz submit, BKT / cognitive profile / `aiFeedbackSummary` update slowly; long `after()` work risks timeout under many topics. |
| **Location** | `lib/ai/pipeline.ts` → `runPostSubmissionAIPipeline`; triggered from `app/actions/quiz-submission.ts` via `after(...)` |
| **Evidence** | For each topic batch: `await knowledgeNode.upsert` → `await findUnique` → `await studentKnowledgeState.upsert` (≈3 RTT × N topics). Then optional `enrichActionPlanWithLLM`, then more serial profile/memory reads/writes. Upstream `ensureTopicsCanonicalized` may call OpenAI and **serial** `persistCanonicalGroups` (nested awaits per group/variant) in `lib/knowledge/topic-canonicalize-ai.ts`. |
| **Fix direction** | Batch upserts (`createMany` + update, or single transaction with fewer round-trips); skip redundant findUnique when upsert returns; parallelize independent topic writes carefully; keep LLM fire-and-forget / deterministic plan only on hot path (practice already skips). |

### 3. Zeno chat — non-streaming OpenAI + sequential crypto/DB
| | |
|---|---|
| **Severity** | **P1** |
| **Symptom** | Chat FAB waits for full reply before UI updates; TTFT high; history load can lag on long sessions. |
| **Location** | `app/actions/chat-zeno.ts` → `sendZenoMessageAction`, `getChatHistoryAction`; UI `components/chat/zeno-chat-modal.tsx` (lazy via `ZenoChatLazy`) |
| **Evidence** | Flow: session get/create → last sequence → encrypt+create user msg → parallel `buildZenoSystemPrompt` + `buildRecentMessageContext` → **blocking** `chat.completions.create` (`max_tokens: 1024`, no stream) → encrypt+create assistant → session update → optional chunk summary OpenAI. `getChatHistoryAction` does **unbounded** `chatMessage.findMany` then decrypts every row. Modal is correctly code-split, but each send is still a full round-trip action. |
| **Fix direction** | Stream tokens (SSE / AI SDK); cap history `take`; store/decrypt incrementally; coalesce sequence+insert in one transaction; consider lighter system prompt for short turns. |

### 4. Result-page AI re-analyze — multi-LLM waterfall + per-question writes
| | |
|---|---|
| **Severity** | **P1** |
| **Symptom** | “Phân tích” on `/quiz/result/[id]` feels very slow when topics are generic or cache miss. |
| **Location** | `app/actions/analyze-submission.ts` → `analyzeSubmissionAction`; client `components/quiz/result/ai-insights-card.tsx` |
| **Evidence** | Possible chain: `autoFixTopics` (OpenAI) → `ensureTopicsCanonicalized` (may OpenAI + DB) → **per-question** `prisma.question.update` via `Promise.all` → main analysis OpenAI → persist summary. Pipeline already wrote a plan on submit; re-analyze can redo expensive work. |
| **Fix direction** | Prefer cached `aiFeedbackSummary` / pipeline plan; gate topic auto-fix; batch question topic updates (`updateMany` or single SQL); one LLM call with structured output. |

### 5. Quiz take path — auth/DB waterfall + KaTeX on critical client bundle
| | |
|---|---|
| **Severity** | **P1** |
| **Symptom** | Slow TTFB to start a quiz; large JS/CSS for first paint of `/quiz/take/[testId]`. |
| **Location** | `getQuizForTaking` in `lib/quiz/quiz-bank-queries.ts`; page `app/quiz/take/[testId]/page.tsx`; `components/quiz/quiz-taker.tsx` + `components/quiz/math-text.tsx` |
| **Evidence** | Serial: `test.findUnique` → `classMember.findFirst` → `classTest.findFirst` (+ adaptive session) → optional `submission.count` → then `$transaction` questions+count. Client tree imports `react-katex` + `katex.min.css` for every question stem/option. |
| **Fix direction** | Single query/join for access + questions + attempt count; defer KaTeX (dynamic import / render visible questions only); preload attempt count with test fetch. |

### 6. Smart / practice quiz bank scan — unbounded-ish JSON ingest
| | |
|---|---|
| **Severity** | **P1** |
| **Symptom** | “Luyện tập cá nhân hóa” / generate smart quiz spikes latency and memory. |
| **Location** | `lib/system-test/mix-practice-from-bank.ts` → `collectPracticeQuestionsFromBank`; callers `app/actions/generate-smart-quiz.ts` |
| **Evidence** | Loads up to **80** `systemTest` rows with full `questions` JSON, parses Zod in JS, filters by topic string match. Fallback loads 5 more. No DB-side topic filter. |
| **Fix direction** | Index/normalize topics on ingest; SQL/jsonb filter by `topicKey`; smaller candidate set; cache pools per topic. |

### 7. Student shell + dashboard request waterfall (mitigated but still deep)
| | |
|---|---|
| **Severity** | **P2** |
| **Symptom** | Every student page under `(student)/layout` pays auth + class resolve before content; dashboard also pulls quiz bank. |
| **Location** | `lib/dashboard/context.ts` `resolveStudentContext`; `lib/auth/session.ts` `getSessionUser`; `lib/dashboard/student-data.ts`; layout + `app/(student)/dashboard/page.tsx` |
| **Evidence** | Per request (React `cache` dedupes within one render): Supabase identity → `user.findUnique` → `resolveStudentClassId` (cookie membership and/or latest) → **another** `classMember`+class → `getStudentShellStats` (2 queries). Dashboard then `Promise.all` of aggregates + **full** `getQuizBankForStudent` (catalog transaction + all submissions for student). Layout and page both call `resolveStudentContext` (shared via `cache` — good). |
| **Fix direction** | Fold class resolve into one membership query; slim dashboard assignments query (don’t reuse full quiz bank); keep shell-stats lean (already improved). |

### 8. Package edit loader — N question fetches (parallel N+1)
| | |
|---|---|
| **Severity** | **P2** |
| **Symptom** | Adaptive package edit slows as tiers/questions grow. |
| **Location** | `lib/quiz/queries.ts` → `getQuizPackageForEdit` |
| **Evidence** | After loading tests, `Promise.all(orderedTests.map(async … question.findMany))` — one query per tier (up to 3–4). |
| **Fix direction** | One `question.findMany({ id: { in: allIds } })` then partition in memory. |

### 9. Teacher student detail — unbounded submissions + serial phases
| | |
|---|---|
| **Severity** | **P2** |
| **Symptom** | `/teacher/students/[id]` grows slower with every attempt; many RTTs before paint. |
| **Location** | `lib/quiz/teacher-student-queries.ts` → `getStudentDetail` |
| **Evidence** | Comment notes PgBouncer avoidance of `$transaction`. Still sequential: membership → **all** submissions (no `take`) → behavior SQL → then parallel BKT + topic SQL. List page `getStudentsForClass` is healthier (groupBy). |
| **Fix direction** | Limit/paginate submissions; run membership+submissions+behavior in parallel where safe; select only needed columns. |

### 10. Gap page optional second catalog load
| | |
|---|---|
| **Severity** | **P3** |
| **Symptom** | Extra latency when opening gaps with `?quiz=` banner. |
| **Location** | `app/teacher/gaps/page.tsx` |
| **Evidence** | After gap map, may call `getQuizPackagesForClass` just to resolve banner title. |
| **Fix direction** | `findUnique` package by id instead of full class package list. |

### 11. Roadmap — unbounded knowledge states
| | |
|---|---|
| **Severity** | **P3** |
| **Symptom** | `/roadmap` payload grows with every practiced topic node. |
| **Location** | `app/(student)/roadmap/page.tsx` |
| **Evidence** | `studentKnowledgeState.findMany` with no `take`, plus memory row. |
| **Fix direction** | Cap / virtualize; aggregate cluster-level on server. |

### 12. Schema / join pressure on class analytics
| | |
|---|---|
| **Severity** | **P2** (amplifies #1) |
| **Symptom** | Class-scoped detail scans rely on joining `tests` by `class_id`; submission lookups by student are indexed, class-wide analytics less so. |
| **Location** | `prisma/schema.prisma` `Submission` (`@@index([studentId])`, unique on `[testId, studentId, attemptNumber]`); gap/teacher raw SQL |
| **Evidence** | No dedicated covering indexes called out for `(test_id)` alone beyond the unique composite (helps) or for detail analytics filters (`is_correct`, etc.). |
| **Fix direction** | EXPLAIN hot SQL; add indexes matching gap-map predicates; consider rollup tables. |

---

## Already in good shape (do not “fix” first)

- Student quiz bank: single `$transaction` catalog + one submission fetch (`getQuizBankForStudentUncached`).
- Teacher dashboard: parallel aggregates + SQL `HAVING` for at-risk (`lib/dashboard/teacher-data.ts`).
- Zeno FAB: dynamic import keeps KaTeX out of initial student layout (`zeno-chat-lazy.tsx`).
- Cache tags/TTLs and submit invalidation (`lib/cache/*`, `invalidateAfterSubmit`).
- Prisma serverless URL rewrite to transaction pooler + `connection_limit=1` (`lib/prisma.ts`).
- Gap-map critical gaps no longer `take: 3000` detail rows (comment notes DISTINCT pairs).

---

## Residual unknowns

- No production APM / `EXPLAIN ANALYZE` / Vercel timing in this worktree — severities are from call graphs and query shape, not measured p95.
- Real class sizes, SystemTest JSON blob sizes, and OpenAI latency not observed at runtime.
- Whether `unstable_cache` hits in the deployed runtime (edge vs Node, multi-instance) affects how often P0 gap-map cold path runs.
- Client bundle weights (KaTeX, quiz-taker) not measured with `next build` analyzer here (no install/build per task constraints).
- `services/api` present but not deep-dived; primary app is Next.js App Router.

---

## Suggested priority for parent

1. Gap-map SQL consolidation (#1)  
2. Pipeline batching / LLM off critical path (#2)  
3. Chat streaming + history cap (#3)  
4. Quiz-take query merge + KaTeX defer (#5)  
5. Practice bank topic-indexed fetch (#6)
