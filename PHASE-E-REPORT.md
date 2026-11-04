# Phase E — Post-submit AI pipeline batching

**Branch:** `thetommylong/fix-ai-pipeline`  
**Worktree:** Orca child `fix-ai-pipeline`  
**Base URL (prod reference):** https://aitonghopmon-ai.vercel.app  

## Changes

| Area | What |
|---|---|
| **Canonicalize persist** | `persistCanonicalGroups` collects nodes/aliases then `Promise.all` upserts (no nested serial awaits). Returns label→canonical map from the write payload so `ensureTopicsCanonicalized` **skips N post-write `findUnique`**. |
| **BKT / knowledge upserts** | One `findMany` for prior `pMastery` across topic nodeIds; parallel `knowledgeNode` + `studentKnowledgeState` upserts. BKT still uses prior mastery → `computeTopicMasteryUpdate` (evidence caps unchanged). |
| **LLM off hot path** | Deterministic `buildStudentActionPlan` + submission/profile/memory writes first; `enrichActionPlanWithLLM` only after. Practice still sets `skipAiCanonicalization` + `skipLlmEnrich`. |
| **Timing logs** | `[AI Pipeline] done … topics=N llm=0\|1 ms=…` and `[submitQuizAction] after() done … ms=…`. |
| **Cache contract** | Unchanged: `invalidateAfterSubmit(classId, studentId)` still called on submit and after adaptive round updates. `bustAfterSubmit` busts `submissions` (covers `classGap` / teacherDash / packages that list that tag), `adaptive`, quizBank (+ student), `studentDash`, `knowledge`. No new tags; no classGap removal. |

## Cache-tag CONTRACT (shared with Phase D)

| Requirement | Status |
|---|---|
| Keep `invalidateAfterSubmit` after submit | **Yes** — `app/actions/quiz-submission.ts` |
| Bust classGap (via submissions tag listing) | **Yes** — `class-gap-map` tags include `CacheTags.submissions(classId)` |
| Bust students / adaptive / packages / teacherDash / submissions / student dash+knowledge / quizBank | **Yes** — direct or via `submissions` co-tag on those caches |
| Extra pipeline tags | **None added** — no Phase D doc delta required |

## SHAs

| Commit | Summary |
|---|---|
| `ffbb54b15dc3b4eb024aaaa6e8821a7dd3904209` | perf(ai): batch post-submit pipeline DB RTTs |
| *(this docs commit)* | docs: Phase E report |

## Verify / timing

**Full submit timing:** **BLOCKED** in this worktree.

**Blocked reason:** No `.env` / `.env.local`. Cannot run local/preview submit against a DB or OpenAI. Must not invent credentials. Measuring production (`aitonghopmon-ai.vercel.app`) would attribute *pre-fix* deploy timings, not these SHAs.

**How parent should verify later (with env or preview deploy):**

1. Submit a multi-topic official quiz (not practice) as a student.
2. Server logs should show `[AI Pipeline] done … topics=N llm=1 ms=…` and `[submitQuizAction] after() done … ms=…` — compare `ms` vs pre-change on same quiz shape (N topics).
3. Result page: `aiFeedbackSummary` present quickly (deterministic plan); optional LLM polish may lag slightly after first write.
4. Spot-check BKT: topic counts / `pMastery` direction match answers (no regression vs mastery-evidence unit tests).
5. Teacher `/teacher/gaps?class=…` refreshes after submit (classGap still busted via submissions tag).

Phase 0 did **not** baseline full submit — no numeric before/after claim here.

## Tests

- `pnpm test` — 51 passed (11 files). Mastery / action-plan unit tests unchanged and green.

## Risks

1. **Concurrent submits** for the same student can still race on knowledge/profile/memory (pre-existing; batching does not add locking).
2. **LLM enrich failure** after deterministic persist leaves plan without polish (acceptable; feedback still present).
3. **`Promise.all` upserts** under PgBouncer `connection_limit=1` queue on one connection — fewer RTTs than nested awaits, but not a single SQL multi-row upsert.
4. **Silent pipeline catch** still swallows errors after `console.error` (pre-existing).

## Left / follow-ups

1. Collect submit/`after()` duration samples once `.env` or a branch preview exists.
2. Optional: raw `INSERT … ON CONFLICT` multi-row for knowledge states if N topics stays high.
3. Phase D merge: rebase if `lib/cache/*` diverges; contract already compatible.
