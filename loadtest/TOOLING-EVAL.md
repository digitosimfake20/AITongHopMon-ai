# Load-test tooling evaluation (Node vs k6 vs Artillery)

**Date:** 2026-11-04  
**Scope:** Evaluate redo of the shipped Node harness (`loadtest/`), **not** a rewrite.  
**Baseline:** Node VU + `fetch`, profiles dry/modest/aggressive, RSC GETs, env cookie/bearer, prod confirm gate, JSON p50/p95/p99.

## Recommendation

**Keep Node for now. Worth a full redo? No.**

Optional later: **hybrid** — keep Node as the default zero-install smoke/modest runner; add a thin **k6** script *only* if we need arrival-rate stages, SLA thresholds in CI, or higher VU counts than Node can schedule fairly. Do **not** switch to Artillery as primary for this repo.

## Comparison

| Dimension | Current Node | k6 | Artillery |
|---|---|---|---|
| Latency percentiles | In-process sorted samples → p50/p95/p99 — fine at modest VUs | First-class histograms, trends, tags; less self-bias | Good percentiles / summaries |
| Streaming / TTFB | One number = full `fetch` + body drain; **no** TTFB vs time-to-last-byte split | Can track `http_req_waiting` vs `http_req_receiving` — better for “multi-second `_rsc` stream for tiny body” | Possible with plugins/custom metrics; less idiomatic than k6 |
| HTTP/2 accuracy | Node `fetch`/undici may multiplex; connection pool ≠ browser; not a protocol lab | Purpose-built HTTP/1.1 & H2 client; more trustworthy under concurrency | Node-based; similar class of limits as our runner |
| VU scheduling | Fixed VUs + linear start delay + think-time loops | Stages, ramping VUs, **constant arrival rate**, executors | Arrival phases, arrivalRate, engines |
| Thresholds / checks | Manual exit on high error rate only | `thresholds` / `checks` fail CI on p95/error SLA | `ensure` / expectations |
| Auth cookie / headers | Already: `LOADTEST_COOKIE` / bearer + scenario gates | Env → `Cookie` header equally easy; cookie jars available | Same; YAML scenarios comfortable |
| Next.js RSC / soft-nav | Custom `?_rsc=1` + `RSC: 1` + Accept — **already fit**; still not a real Router State Tree | Same headers; no magic Next insight; custom JS scenarios OK | Same headers via YAML/JS |
| CI / local DX | **Zero install** beyond Node already required | Separate binary (apk/brew/CI image) or `xk6`; **no npm postinstall** if binary-only | `npm i artillery` — larger tree; **lifecycle/postinstall risk** (coordinator: do not auto-accept) |
| Lockfile / size | No new deps | Outside pnpm lockfile if binary | Adds deps to app or nested package |
| High VU / soak | Event-loop + GC; OK ≤~20–50 VUs here; not a soak lab | Designed for this | Better than DIY Node at scale |

## What we lose by staying on Node

- Split **waiting vs receiving** latency (the bottleneck pattern is stream completion, not TTFB).
- Declarative **stages / arrival-rate** and **threshold-gated CI**.
- Confidence that the client is not the bottleneck past ~tens of VUs.
- Ecosystem dashboards (k6 Cloud / native HTML) without DIY.

What we **do not** lose for current goals: public+cookie scenarios, prod safety gate, RSC-ish GETs, modest concurrent stress, p50/p95/p99 JSON under `results/`.

## Why not redo now

1. Harness already matches the product need: stress configured `BASE_URL` hot document/`_rsc` GETs with env auth and hard caps — not a protocol or 1k-VU study.
2. Redo cost (port scenarios, re-document cookies, CI install, human approval for any install scripts) exceeds the accuracy gap at **modest** profiles (5–20 VUs).
3. Artillery’s main DX win (YAML) is outweighed by **npm install/postinstall** friction vs a binary k6 *or* staying on Node.
4. If streaming fidelity matters later, prefer **k6** over Artillery — not a third Node HTTP tool.

## If we ever switch

- **k6:** one `loadtest/k6/*.js`, document binary install, map profiles → stages, keep Node `dry` as no-binary smoke; preserve `LOADTEST_CONFIRM_PROD` wrapper.
- **Artillery:** only if the team already standardizes on it elsewhere and accepts dependency + postinstall review.
- **Hybrid (best future):** Node remains default; k6 optional for thresholded soaks.
