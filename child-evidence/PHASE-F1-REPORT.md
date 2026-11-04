# Phase F1 — Zeno chat streaming + history cap

**Branch:** `thetommylong/fix-zeno-stream`  
**Worktree:** Orca child `fix-zeno-stream`  
**Base URL (prod reference):** https://aitonghopmon-ai.vercel.app  
**Student profile (do not logout):** `4d2a68b3-225f-4baa-b24e-faaa6dd92942`

## Changes

| Area | What |
|---|---|
| **SSE streaming** | New `POST /api/zeno/chat` returns `text/event-stream` token events (`meta` → `token*` → `done` / `error`). OpenAI `stream: true` via `createZenoChatStream`. |
| **Turn helpers** | `lib/ai/zeno-chat-turn.ts`: `prepareZenoTurn` (auth, session, encrypt user msg, build messages), `finalizeZenoTurn` (encrypt assistant, count++, optional chunk summary), shared by SSE route + non-stream `sendZenoMessageAction` fallback. |
| **Modal UX** | `zeno-chat-modal.tsx` consumes SSE; appends tokens into a live assistant bubble (spinner only until first token). No full-page wait on reply. |
| **History cap** | `getChatHistoryAction` uses `take: CHAT_HISTORY_TAKE` (50), newest-first then reverse; decrypts one message at a time. |
| **Light prompt** | Short turns (≤120 chars and session `<` 8 msgs) use `buildZenoSystemPromptLight` (name + persona only) and 6-message context instead of full memory + 20. |

## Out of scope (untouched)

- Gap-map / teacher loaders / `math-text` (F2/F3 / Phase D)
- No AI SDK package added — native OpenAI stream + SSE

## SHAs

| Commit | Summary |
|---|---|
| `0c83981cf91efdb8e3d58233e512591ebba5c97c` | perf(zeno): stream chat tokens + cap history decrypt |
| `97a69dc050c9785002d20f5891466ca573e0b44d` | docs: add Phase F1 streaming report |
| `5391e1d65306378d505e852787c084dff85e377d` | docs: record Phase F1 report SHA |

## Verify / timing

**Chat turn TTFT + complete medians:** **BLOCKED** in this worktree.

**Blocked reason:** No `.env` / `.env.local`. Cannot call OpenAI or hit a real DB-backed session locally. Must not invent credentials. Measuring production (`aitonghopmon-ai.vercel.app`) would attribute *pre-fix* deploy timings, not these SHAs.

Phase 0 did **not** time paid Zeno chat turns (only `/chat` shell Navigation Timing) — no numeric before/after claim here.

**How parent should verify later (with env or preview deploy):**

1. Sign in as student `4d2a68b3-225f-4baa-b24e-faaa6dd92942` (no logout of other sessions unless intentional).
2. Open Zeno modal; send a short question — tokens should appear incrementally (TTFT measurable in Network on `/api/zeno/chat`).
3. Open a long session — history load should decrypt ≤50 messages (check response size / server query).
4. Confirm short vs long turns: short should skip full memory DB reads (optional server log of `lightPrompt` from SSE `meta`).

## Tests

- `pnpm test` — 51 passed (11 files). No chat-specific unit tests added (crypto/stream need env).

## Risks

1. **User message persisted before stream** — if the model/stream fails after `prepareZenoTurn`, the user row remains without an assistant reply (pre-existing race shape; SSE now surfaces `error` event).
2. **Sequence races** under concurrent tabs on the same session (pre-existing).
3. **History window** of 50 means older messages are not shown in the modal (still in DB / summaries).
4. **KaTeX on partial tokens** may briefly fail mid-formula until the closing `$` arrives.

## Left / follow-ups

1. Collect TTFT + full-turn medians once `.env` or a branch preview exists.
2. Optional: AI SDK `streamText` if the team standardizes on it later.
3. Optional: paginate “load older” beyond the 50-message cap.
