# Student runtime bottleneck capture (read-only)

**Date:** 2026-11-04  
**Base URL:** https://aitonghopmon-ai.vercel.app  
**Profile:** `4d2a68b3-225f-4baa-b24e-faaa6dd92942` (label `student`)  
**Session:** Worked. Auth cookie `sb-*-auth-token` present; dashboard greets **Nguyễn**, class **Lớp 9A2**, role student. No logout / cookie clear.  
**Method:** Orca embedded browser (`tab create --profile`), Navigation Timing + Resource Timing via `eval`, `network`/`console`/`screenshot`. No product code edits. Quiz take opened to intro only (did not start/submit). Chat observed load only (no Zeno turns).

Screenshots: `browser-evidence/01-dashboard.png` … `07-landing-logged-in.png`

---

## Ranked findings

### 1. Student shell pages: fast HTML TTFB, slow first paint (High)

| Route | Doc TTFB | DCL | Load / FCP | Wall (goto→load) |
|---|---:|---:|---:|---:|
| `/dashboard` (first cold-ish) | 34 ms | 16062 ms | 16376 ms | ~17 s |
| `/dashboard` (remeasure) | 40 ms | 3189 ms | FCP 3060 ms | ~3.7 s |
| `/quizzes` | 35 ms | 4430 ms | FCP 4488 ms | ~5.4 s |
| `/adaptive` | 34 ms | 6196 ms | FCP 6260 ms | ~7.0 s |
| `/roadmap` | 35 ms | 5142 ms | FCP 5212 ms | ~6.0 s |
| `/chat` | 39 ms | 3370 ms | FCP 3428 ms | ~4.3 s |
| `/quiz/take/...` (intro) | 39 ms | 4698 ms | FCP 4776 ms | ~5.5 s |
| `/` landing | 39 ms | 129 ms | FCP 228 ms | fast |

**Symptom:** Logged-in student routes feel multi-second blank/slow despite ~35–40 ms document TTFB and small HTML transfer (~9–12 KB).  
**Evidence:** Performance Navigation Timing above; resource timing shows many parallel JS chunks + fonts; first dashboard load especially bad (~16 s).  
**Severity:** High (primary UX latency).  
**Fix direction only:** Profile SSR vs client waterfalls; reduce student-layout JS; defer non-critical client components; investigate why DCL ≫ responseEnd (hydration / main-thread work). Prefer soft navigations + streaming over full document reloads where possible.

### 2. React hydration mismatch on every student shell page (High)

**Symptom:** Console `Uncaught Error: Minified React error #418` (hydration text mismatch) on `/dashboard`, `/quizzes`, `/adaptive`, `/roadmap`, `/chat`. Not observed on quiz-take intro or marketing `/`.  
**Evidence:** `goto` `effects.consoleErrors` on those routes; React docs: server HTML text ≠ client first render.  
**Severity:** High (correctness + extra client work / possible flicker).  
**Fix direction only:** Find time/locale/greeting/relative-date or class-label divergence between server and client; render dynamic bits only after mount or pass stable server values.

### 3. Aggressive RSC prefetch of all nav targets on each page (Medium)

**Symptom:** After each student page load, browser fetches `_rsc` payloads for sibling routes (`/chat`, `/adaptive`, `/roadmap`, `/quizzes`, `/onboarding`, often `/quiz/take/<id>`), each ~300–1600 ms TTFB even when payloads are tiny (~450–1300 B).  
**Evidence (dashboard first load):** `/chat?_rsc=…` dur/ttfb **1647 ms**; `/dashboard?_rsc=…` **914 ms**; many peers 340–560 ms. Remeasure still showed 4+ RSC prefetches at 300–500 ms.  
**Severity:** Medium (contends with critical path; wastes serverless capacity).  
**Fix direction only:** Narrow `prefetch` on sidebar links; prefetch on hover/viewport; avoid prefetching heavy quiz-take RSC from overview.

### 4. Large shared JS + many font files on student shell (Medium)

**Symptom:** Repeated transfer of large chunks (e.g. `12mz0_._155bq.js` ~72 KB; quiz route also `07bc1plen123d.js` ~79 KB) and **~13 woff2** fonts counted on dashboard remasure.  
**Evidence:** Resource Timing sizes; font count via `performance.getEntriesByType("resource")`.  
**Severity:** Medium (cold load / CPU parse cost).  
**Fix direction only:** Subset fonts; delay secondary faces; split/lazy student chat & map code; audit shared layout imports.

### 5. Marketing `/` ignores active student session (Low–Medium UX)

**Symptom:** With valid student auth cookie, `/` still shows **Đăng nhập / Đăng ký** marketing CTAs, not student nav.  
**Evidence:** Cookie present; snapshot/landing screenshot `browser-evidence/07-landing-logged-in.png`; no student shell.  
**Severity:** Low–Medium (confusing entry; not a network bottleneck).  
**Fix direction only:** Redirect authenticated students to `/dashboard`, or swap header CTAs for session-aware links.

### 6. Assigned class quiz blocked as overdue; practice links still open (Info)

**Symptom:** `/quizzes` primary assigned item shows **Quá hạn** / disabled **Không thể làm**. `/adaptive` still lists several **Làm bài** links; quiz-take intro loads (**Sẵn sàng làm bài**) without submitting.  
**Evidence:** Snapshots `02-quizzes.png`, `03-adaptive.png`, `06-quiz-take-intro.png`.  
**Severity:** Info / product policy (blocks assigned-path testing).  
**Fix direction only:** N/A for perf; clarify overdue UX vs continue-allowed paths.

---

## Session / journey coverage

| Journey | Result |
|---|---|
| Landing → dashboard | Session works via `/dashboard`; landing does not reflect login |
| Quizzes list | Loaded; assigned quiz not startable (overdue) |
| Open quiz | Adaptive practice quiz intro only; no answers submitted |
| Roadmap / knowledge map | Loaded (empty/guidance state) |
| Chat / Zeno | Page load only; no paid chat turns |
| Adaptive | Loaded; recent practice list present |

`ORCA network` entries include status/method/URL/mime but **no duration/size fields** in this CLI build; timings above are from browser Performance APIs.

---

## What’s left (out of scope)

- No product fixes applied.  
- No Lighthouse / Web Vitals lab run.  
- No deep attribution of React #418 source file (would need non-minified / code map).  
- Did not exercise long Zeno chat or full quiz attempt.
