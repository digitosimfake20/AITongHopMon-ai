# Phase F3 — Practice bank indexing + result re-analyze

**Branch:** `thetommylong/fix-practice-analyze`  
**Worktree:** Orca child `fix-practice-analyze`  
**Base URL (prod reference):** https://aitonghopmon-ai.vercel.app  

## Changes

| Area | What |
|---|---|
| **Practice bank SQL filter** | `collectPracticeQuestionsFromBank` no longer `findMany` + `take: 80` full JSON rows. Raw SQL prefilters EASY/MEDIUM `system_tests` by group topic, title, or jsonb `topic` / `topicKey`, then ships at most **24** candidate rows. |
| **topicKey at ingest** | `stampQuestionTopicKeys` stamps normalized `topic` + `topicKey` into SystemTest JSON on publish/update (`system-test.ts`, `test-group.ts`). Optional `topicKey` on question Zod schema. **No Prisma migration** (additive JSON only). |
| **Smart quiz** | `generateSmartQuizAction` passes `topicKeys` into the bank collector for needle matching. |
| **Re-analyze cache** | `analyzeSubmissionAction(id, { force })` returns parsed `aiFeedbackSummary` (Phase E pipeline plan) when `force` is false. UI: “Tạo phân tích” → cache; “Làm mới lời khuyên” → `force: true`. |
| **Batch topic writes** | Replaced per-question `prisma.question.update` fan-out with one `UPDATE … FROM (VALUES …)` via `batchUpdateQuestionTopics`. Skips unchanged rows. |
| **Generic-topic gate** | `isGenericTopicSet` also considers distinct non-default `topicKey`s before calling `autoFixTopics`. |

## Cache-tag CONTRACT (Phase E)

| Requirement | Status |
|---|---|
| Keep `invalidateAfterSubmit` after submit | **Untouched** — F3 does not edit `quiz-submission.ts` / `lib/cache/invalidate.ts` |
| Pipeline writes `Submission.aiFeedbackSummary` | **Consumed** on re-analyze (prefer cache) |
| Extra bust tags from analyze / smart-quiz | **None** for analyze; smart-quiz still busts quizBank + studentDash only (pre-existing) |

## Migration decision

Skipped a `system_tests.topic_keys text[]` (or similar) column. Filtering uses jsonb + group topic; ingest stamps keys into question JSON. Ask parent before any backfill SQL or additive column if bank size grows past jsonb scan comfort.

## SHAs

| Commit | Summary |
|---|---|
| _(filled after commit)_ | perf(practice): SQL topic filter + stamp topicKey at ingest |
| _(filled after commit)_ | perf(analyze): prefer aiFeedbackSummary cache; batch topic updates |
| _(filled after commit)_ | docs: add Phase F3 practice/analyze report |

## Verify / timing

**Smart-quiz generate + “Phân tích” click:** **BLOCKED** in this worktree.

**Blocked reason:** No `.env` / `.env.local`. Cannot time local/preview generate or re-analyze against DB/OpenAI. Phase 0 did not baseline these flows. Must not invent credentials.

**How parent should verify later (with env or preview deploy):**

1. Publish/update a system test or adaptive group → inspect `system_tests.questions` JSON for `topicKey` on each item.
2. Student “Luyện ngay” / smart quiz for a known weak topic → server should load ≤24 candidate bank rows (not 80 unfiltered).
3. After official submit, open result: analysis should appear from pipeline without clicking (or “Tạo phân tích” returns instantly from cache).
4. Click “Làm mới lời khuyên” → one analyze LLM path; question topic updates should be a single SQL statement.
5. Confirm teacher gap map / dashboards still refresh after submit (`invalidateAfterSubmit` unchanged).

## Tests

- `pnpm test` — **58 passed** (14 files), including new unit tests for stamp / needles / cache parse.

## Risks

1. **Legacy bank rows** without `topicKey` still match via ILIKE on `topic` / group topic; very old rows with empty topics may miss until republish.
2. **JSONB EXISTS** still scans question arrays on the DB for candidates (no GIN index); capped return set is the main Node win.
3. **Cache prefer** means “Tạo phân tích” will not re-LLM if pipeline summary exists — intentional; refresh is explicit.
4. **force refresh** still runs full analysis LLM (not thin enrich only) — quality preserved; further thinning is optional follow-up.

## Left / follow-ups

1. Collect smart-quiz + re-analyze timings once `.env` or branch preview exists.
2. Optional parent-approved: `topic_keys text[]` + GIN / expression index + one-shot backfill.
3. Optional: force refresh = thin `enrichActionPlanWithLLM` on cached plan instead of full `ANALYSIS_SYSTEM_PROMPT` pass.
