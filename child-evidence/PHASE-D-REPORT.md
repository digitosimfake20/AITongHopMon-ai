# Phase D — Gap-map SQL consolidation (+ KaTeX noise)

**Branch:** `thetommylong/fix-gap-map`  
**Teacher profile (verify):** `03183047-c3c1-4f01-b79b-36f32a7329ce`  
**Class (Phase 0 baseline):** 9A2 `4eb54d69-b919-47b3-bd8b-436a24736ded`  
**Phase 0 soft `_rsc` median (gaps):** ~2572 ms (prod)

## What changed

### D1 — SQL / cache (`lib/quiz/class-gap-map.ts`)

**Before:** serial waterfall ≈ classroom → topic agg SQL → student×topic SQL → alias lookup → wrong-question SQL → `question.findMany` → wrong-student SQL → `user.findMany` → `submission.groupBy` → another `user.findMany` → `test.findMany` → completion SQL (~10–12 RTTs). Null cache miss re-ran the full uncached path.

**After:**
1. `classroom.findFirst` (auth + member count) — 1 RTT  
2. **One CTE** (`fetchClassGapMapSql`) returning a single `jsonb` payload with topics, studentTopics, questionWrongs (+ question meta), wrongStudents (+ names), submissionAvgs (+ names), completedPairs, testCount — 1 RTT  
3. `topicCanonicalAlias.findMany` (label-dependent; cannot fold into CTE without duplicating canonicalize rules) — 1 RTT  

**No `Promise.all` of Prisma clients** on this path (PgBouncer `connection_limit=1`).

**Null-cache fix:** `getClassGapMapData` now returns the cached value including `null`. Re-running uncached on every null doubled cold-miss cost; ownership/empty nulls are correct and busted via tags.

### Cache-tag CONTRACT (Phase E)

Unchanged central modules — **do not invent parallel schemes**:

| Concern | Value |
|---|---|
| Read tag | `CacheTags.classGap(classId)` |
| Soft TTL | `CacheTTL.classGap` = **300s** |
| Extra tag on gap entry | `CacheTags.submissions(classId)` so submit busts gap via submissions |
| Submit | `invalidateAfterSubmit` → `bustAfterSubmit` busts `submissions` (+ adaptive, quizBank*, studentDash, knowledge). Gap/teacherDash/packages that list `submissions` invalidate with it. |
| Roster / assign | `invalidateAfterRoster` / `bustClassCaches` still bust `classGap` **directly** |

No new tags or TTLs added in Phase D.

### D2 — Banner (`app/teacher/gaps/page.tsx`)

`?quiz=` banner uses `quizPackage.findFirst({ id, classId })` instead of `getQuizPackagesForClass` (full package list + cache).

### D3 — KaTeX Vietnamese (`components/quiz/math-text.tsx`)

`$…$` / `$$…$$` segments whose interior contains Vietnamese diacritics (e.g. `ờ`) render as **prose**, not KaTeX — stops “Unrecognized Unicode character” / missing-metrics console spam on gaps.

**Phase F2 note:** this shared `MathText` is the preferred owner for delimiter/prose heuristics. Quiz-take / result paths already import it — avoid a second heuristic copy in Phase F.

## Optional index notes (no migration applied)

Existing helpful indexes:
- `tests(class_id)`, `submissions` unique `(test_id, student_id, attempt_number)`, `submission_details(submission_id)`, `submission_details(question_id)`, `questions(topic_key)`

If EXPLAIN (when DB available) shows repeated nested-loop on details→submissions→tests for class filters, consider a non-destructive:
- `CREATE INDEX CONCURRENTLY … ON core.submissions (test_id)` if planner is not using the unique leading column well under pooler stats, and/or
- partial index on `submission_details (question_id) WHERE is_correct = false` for wrong-agg path  

**Do not ship destructive migrations without parent approval.**

## Verify

| Check | Status |
|---|---|
| Soft `_rsc` post-fix medians on prod gaps | **Blocked** — no local `DATABASE_URL` / `node_modules` in this worktree; code not deployed. Baseline remains Phase 0 ~2572 ms. |
| Code evidence | CTE collapses 4–5 detail scans + N Prisma finds into 1 SQL + 1 alias; null double-run removed; banner `findFirst`; KaTeX prose guard |
| Unit tests | Blocked locally (`pnpm` bins missing until install) |

## Commits

See `git log` on this branch after Phase D landing (SHAs in worker_done).
