# Teacher runtime bottleneck capture (read-only)

**App:** https://aitonghopmon-ai.vercel.app  
**Profile:** `03183047-c3c1-4f01-b79b-36f32a7329ce` (label `teacher`)  
**Class exercised:** `4eb54d69-b919-47b3-bd8b-436a24736ded` (Lớp 9A2 · 22 học sinh)  
**Session:** Initially redirected to `/login`. After coordinator restored the session, authenticated teacher flows worked. No credentials invented; no product code edits; no destructive mutations.

**Method:** Orca embedded browser — hard `goto` Navigation Timing + soft click Resource Timing (`_rsc` RSC payloads), `network`, `console`. Screenshots repeatedly timed out (`Page.captureScreenshot` — page did not draw a frame); evidence is timing/network/console.

---

## Ranked findings

### 1. Adaptive assignment UI — severe SSR/RSC stream latency — **Critical**

| | |
|---|---|
| **Symptom** | `/teacher/adaptive` feels multi-second blank/slow after click or full reload |
| **Route** | `/teacher/adaptive?class=4eb54d69-b919-47b3-bd8b-436a24736ded` |
| **Evidence** | Soft RSC: `GET .../teacher/adaptive?...&_rsc=...` **5063 ms**, transfer **1952 B**, wait≈323 ms, download/stream **4714 ms**, status 200. Hard nav: duration **8570 ms**, TTFB≈40 ms, response window≈8186 ms, HTML transfer≈8.7 KB. Soft click wall≈5.4 s. |
| **Severity** | Critical |
| **Fix direction** | Profile server work for adaptive list (DB joins / progress aggregates). Stream a shell via Suspense; defer per-assignment progress. Cache class-scoped adaptive summary. |

### 2. Students list — slow RSC + per-row prefetch — **High**

| | |
|---|---|
| **Symptom** | Danh sách học sinh takes several seconds; many follow-up fetches |
| **Route** | `/teacher/students?class=4eb54d69-...` |
| **Evidence** | Soft RSC **4591 ms** / ~5 KB (wait≈327, stream≈4263). Hard nav **5132 ms**. After load, prefetch of individual `/teacher/students/<id>?_rsc=` (~300–600 ms each). Soft wall≈6.2 s. |
| **Severity** | High |
| **Fix direction** | Slim server payload for list (avoid per-student heavy joins). `prefetch={false}` (or viewport prefetch) on student rows. Paginate/virtualize if class size grows. |

### 3. Global Next.js RSC prefetch storm on teacher chrome — **High**

| | |
|---|---|
| **Symptom** | Every teacher page fires dozens of parallel `_rsc` GETs for nav + variants |
| **Routes** | All `/teacher/*` (seen on dashboard, adaptive, gaps, students, test-bank, assignments) |
| **Evidence** | Soft navigations reported **prefetch_count 27–33**. Duplicate flights (`_rsc=ibE5iCADNvO1JAdB` and `_rsc=gZsLosYETQSuBOdb`) for same paths (with/without `class=`, `mode=`, `filter=`). Each typically 300–600 ms, status 200, tiny bodies. `ORCA network` shows a burst of `text/x-component` after layout settle. |
| **Severity** | High (contends with the real navigation RSC; burns serverless time) |
| **Fix direction** | Disable default Link prefetch for secondary nav / query variants; prefetch only likely next hop. Avoid mounting many `<Link prefetch>` with alternate query strings on first paint. |

### 4. Assignments (“Giao bài & Ngân hàng Đề”) — slow primary RSC — **High**

| | |
|---|---|
| **Symptom** | Assignments view slow on soft nav |
| **Route** | `/teacher/assignments?class=4eb54d69-...` |
| **Evidence** | Soft RSC **3572 ms** / ~2.1 KB (stream≈3218). Soft wall≈5.6 s. |
| **Severity** | High |
| **Fix direction** | Same as adaptive: isolate slow assignment queries; stream UI shell first; cache class assignment list. |

### 5. Test-bank browse — elevated SSR latency — **Medium**

| | |
|---|---|
| **Symptom** | Đề hệ thống slow to become interactive |
| **Route** | `/teacher/test-bank?class=4eb54d69-...` |
| **Evidence** | Soft RSC **2938 ms** / ~5.3 KB. Hard nav ~4.0 s (resp window≈3647 ms). Soft wall≈4.6 s. |
| **Severity** | Medium |
| **Fix direction** | Paginate bank; defer heavy KaTeX/content until visible; cache catalog queries. |

### 6. Gap map — SSR latency + KaTeX console noise — **Medium**

| | |
|---|---|
| **Symptom** | Bản đồ lỗ hổng slow; console spam |
| **Routes** | `/teacher/gaps?class=...` (also `/teacher/classes/[id]/gaps` redirects/normalizes to gaps?class=) |
| **Evidence** | Soft RSC **2572 ms** / ~4.8 KB. Hard nav ~3.6–5.4 s. Console warnings (× many): `Unrecognized Unicode character "ờ"` / `No character metrics for 'ờ'` (KaTeX strict). |
| **Severity** | Medium (latency) / Low–Medium (console quality) |
| **Fix direction** | Speed gap aggregation query; keep Vietnamese prose outside KaTeX math mode or escape properly. |

### 7. Dashboard hard load — moderate — **Medium**

| | |
|---|---|
| **Symptom** | `/teacher` overview not instant |
| **Route** | `/teacher` / `/teacher?class=...` |
| **Evidence** | First authenticated hard load Navigation Timing ≈ **3389 ms** (DCL≈3329). Immediately followed by multi-route RSC prefetches. |
| **Severity** | Medium |
| **Fix direction** | Split overview widgets into streamed Suspense; reduce cross-route prefetch. |

### 8. Screenshot / paint capture failures — **Low (tooling/env)**

| | |
|---|---|
| **Symptom** | `ORCA screenshot` fails with CDP timeout |
| **Evidence** | Repeated: `Screenshot timed out — the browser page did not draw a frame.` |
| **Severity** | Low for product (may be host/browser); worth checking if users see blank paints on adaptive. |
| **Fix direction** | Re-check paint with desktop DevTools; ensure loading UI paints something during long RSC. |

---

## Timing summary (class 9A2)

| Journey | Soft wall | Primary `_rsc` duration | Body size | Hard nav duration |
|---------|-----------|-------------------------|-----------|-------------------|
| Adaptive | ~5.4 s | **5063 ms** | ~2 KB | **8570 ms** |
| Students | ~6.2 s | **4591 ms** | ~5 KB | **5132 ms** |
| Assignments | ~5.6 s | **3572 ms** | ~2 KB | — |
| Test-bank | ~4.6 s | **2938 ms** | ~5 KB | ~4023 ms |
| Gaps | ~4.2 s | **2572 ms** | ~5 KB | ~3641 ms |
| Dashboard | — | — | ~11 KB HTML | ~3389 ms |

Pattern: **TTFB low (~30–50 ms) but response/stream window multi-second for small payloads** → server-side work / streaming completion, not fat downloads.

---

## Console

- No hard JS errors observed on the journeys exercised.
- Repeated KaTeX warnings for Vietnamese character `ờ` on gaps (and carried console history).

---

## Suggested fix priority (direction only)

1. Instrument/server-profile **adaptive** and **students** page data loaders (largest TTFB→complete gaps).
2. Cut **Link prefetch** noise in teacher shell and student lists.
3. Add **Suspense** boundaries so chrome + skeletons paint before heavy data.
4. Sanitize **KaTeX** input for Vietnamese text.
5. Cache class-level aggregates (gaps, adaptive progress, assignment lists).

No product code was changed in this pass.
