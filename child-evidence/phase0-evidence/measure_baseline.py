#!/usr/bin/env python3
"""Multi-sample Phase 0 performance baselines via orca browser CLI. No product edits."""
from __future__ import annotations

import json
import math
import subprocess
import sys
import time
from pathlib import Path

TEACHER = "8b9a9016-e416-458e-98ed-e7a66d16bd93"
STUDENT = "a1cba943-8b5e-49bd-8d31-3b507eb68e2b"
BASE = "https://aitonghopmon-ai.vercel.app"
CLASS = "4eb54d69-b919-47b3-bd8b-436a24736ded"
OUT = Path(__file__).resolve().parent / "baseline_raw.json"
N = 5

TEACHER_ROUTES = [
    ("/teacher", f"/teacher?class={CLASS}"),
    ("/teacher/adaptive", f"/teacher/adaptive?class={CLASS}"),
    ("/teacher/students", f"/teacher/students?class={CLASS}"),
    ("/teacher/assignments", f"/teacher/assignments?class={CLASS}"),
    ("/teacher/gaps", f"/teacher/gaps?class={CLASS}"),
    ("/teacher/test-bank", f"/teacher/test-bank?class={CLASS}"),
]

STUDENT_ROUTES = [
    "/dashboard",
    "/quizzes",
    "/adaptive",
    "/roadmap",
    "/chat",
]


def run(args: list[str], timeout: int = 120) -> dict:
    proc = subprocess.run(
        ["orca", *args, "--json"],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    raw = proc.stdout.strip() or proc.stderr.strip()
    try:
        data = json.loads(raw.split("\n")[-1] if "\n" in raw and not raw.startswith("{") else raw)
        # orca emits single JSON object; if multi-line, take whole
        if not isinstance(data, dict) or "ok" not in data:
            data = json.loads(raw)
    except json.JSONDecodeError:
        # find last JSON object
        start = raw.find("{")
        if start < 0:
            raise RuntimeError(f"orca failed: {args}\n{raw}\n{proc.stderr}")
        data = json.loads(raw[start:])
    if not data.get("ok", True) and data.get("error"):
        raise RuntimeError(f"orca error {args}: {data}")
    return data


def eval_js(page: str, expression: str) -> object:
    data = run(["eval", "--page", page, "--expression", expression])
    return data.get("result", {}).get("result")


def wait_url(page: str, substr: str, timeout_s: float = 30) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            run(["wait", "--page", page, "--url", substr], timeout=min(15, int(timeout_s)))
            return
        except Exception:
            time.sleep(0.5)
    url = eval_js(page, "location.href")
    raise TimeoutError(f"wait url {substr} timed out; at {url}")


def wait_load(page: str) -> None:
    try:
        run(["wait", "--page", page, "--load", "load"], timeout=60)
    except Exception:
        pass


def goto(page: str, path: str) -> None:
    url = path if path.startswith("http") else BASE + path
    last_err: Exception | None = None
    for attempt in range(4):
        try:
            run(["goto", "--page", page, "--url", url], timeout=120)
            wait_load(page)
            # confirm we landed
            time.sleep(1.0)
            href = str(eval_js(page, "location.href") or "")
            if path.split("?")[0] in href or url in href:
                time.sleep(0.5)
                return
            # soft recovery: location may still be updating
            time.sleep(2.0)
            href = str(eval_js(page, "location.href") or "")
            if path.split("?")[0] in href:
                return
        except Exception as e:
            last_err = e
            print(f"  goto retry {attempt+1}: {e}", flush=True)
            time.sleep(2.0 + attempt)
    if last_err:
        raise last_err
    raise RuntimeError(f"goto failed for {url}")


def soft_click_nav(page: str, path_prefix: str) -> float:
    """Soft-nav by clicking matching <a>; returns wall_ms."""
    # Clear resource timings before click
    eval_js(
        page,
        "performance.clearResourceTimings(); performance.setResourceTimingBufferSize(1000); 'ok'",
    )
    # Prefer exact class-query links when present
    expr = f"""
(() => {{
  const want = {json.dumps(path_prefix)};
  const links = Array.from(document.querySelectorAll('a[href]'));
  let el = links.find(a => {{
    try {{
      const u = new URL(a.href, location.origin);
      return u.pathname === want || u.pathname.startsWith(want + '/');
    }} catch {{ return false; }}
  }});
  if (!el) {{
    el = links.find(a => (a.getAttribute('href')||'').includes(want));
  }}
  if (!el) return JSON.stringify({{ok:false, hrefs: links.map(a=>a.getAttribute('href')).slice(0,30)}});
  const t0 = performance.now();
  el.click();
  return JSON.stringify({{ok:true, href: el.getAttribute('href'), t0}});
}})()
"""
    raw = eval_js(page, expr)
    info = json.loads(raw) if isinstance(raw, str) else raw
    if not info.get("ok"):
        raise RuntimeError(f"no link for {path_prefix}: {info}")
    t0_wall = time.time()
    # wait until pathname matches
    deadline = time.time() + 45
    while time.time() < deadline:
        cur = eval_js(page, "location.pathname")
        if cur == path_prefix or (isinstance(cur, str) and cur.startswith(path_prefix)):
            break
        time.sleep(0.2)
    else:
        raise TimeoutError(f"soft nav to {path_prefix} failed; at {eval_js(page, 'location.href')}")
    # settle: wait for primary rsc + peer prefetches; stabilize peer count
    last = -1
    stable = 0
    for _ in range(20):
        time.sleep(0.5)
        try:
            cnt = int(eval_js(page, "performance.getEntriesByType('resource').filter(e=>e.name.includes('_rsc')).length"))
        except Exception:
            cnt = last
        if cnt == last and cnt > 0:
            stable += 1
            if stable >= 2:
                break
        else:
            stable = 0
        last = cnt
    wall = (time.time() - t0_wall) * 1000
    return wall


def collect_rsc(page: str) -> dict:
    raw = eval_js(
        page,
        """
(() => {
  const res = performance.getEntriesByType('resource');
  const mapped = res.filter(e => e.name.includes('_rsc')).map(e => ({
    name: e.name,
    duration: Math.round(e.duration),
    transferSize: Math.round(e.transferSize || 0),
    encodedBodySize: Math.round(e.encodedBodySize || 0),
    startTime: Math.round(e.startTime),
    responseEnd: Math.round(e.responseEnd),
  })).sort((a,b) => a.startTime - b.startTime);
  const primary = mapped.find(m => {
    try { return new URL(m.name).pathname === location.pathname; } catch { return false; }
  }) || mapped[0] || null;
  return JSON.stringify({
    url: location.href,
    pathname: location.pathname,
    peerCount: mapped.length,
    primaryRsc: primary,
    all: mapped,
  });
})()
""",
    )
    return json.loads(raw) if isinstance(raw, str) else raw


def collect_nav_timing(page: str) -> dict:
    # Paint can land after loadEvent for streamed SSR; poll briefly for FCP.
    raw = None
    for _ in range(8):
        raw = eval_js(
            page,
            """
(() => {
  const n = performance.getEntriesByType('navigation')[0];
  const paints = performance.getEntriesByType('paint');
  const fcp = paints.find(p => p.name === 'first-contentful-paint')
    || performance.getEntriesByName('first-contentful-paint')[0];
  return JSON.stringify({
    url: location.href,
    type: n && n.type,
    ttfb: n ? Math.round(n.responseStart) : null,
    ttfb_request: n ? Math.round(n.responseStart - n.requestStart) : null,
    responseStart: n ? Math.round(n.responseStart) : null,
    responseEnd: n ? Math.round(n.responseEnd) : null,
    dcl: n ? Math.round(n.domContentLoadedEventEnd) : null,
    load: n ? Math.round(n.loadEventEnd) : null,
    fcp: fcp ? Math.round(fcp.startTime) : null,
    duration: n ? Math.round(n.duration) : null,
    transferSize: n ? Math.round(n.transferSize || 0) : null,
  });
})()
""",
        )
        parsed = json.loads(raw) if isinstance(raw, str) else raw
        if parsed and parsed.get("fcp") is not None:
            return parsed
        time.sleep(0.5)
    return json.loads(raw) if isinstance(raw, str) else raw


def console_has_418(page: str) -> bool:
    try:
        data = run(["console", "--page", page, "--limit", "200"], timeout=30)
    except Exception:
        return False
    result = data.get("result", {})
    entries = (
        result.get("entries")
        or result.get("logs")
        or result.get("messages")
        or (result if isinstance(result, list) else [])
    )
    if not isinstance(entries, list):
        return False
    for e in entries:
        blob = json.dumps(e, ensure_ascii=False)
        if "#418" in blob or "Minified React error #418" in blob:
            return True
        if "418" in blob and ("React" in blob or "hydration" in blob.lower()):
            return True
    return False


def reset_capture(page: str) -> None:
    try:
        run(["capture", "stop", "--page", page], timeout=30)
    except Exception:
        pass
    try:
        run(["capture", "start", "--page", page], timeout=30)
    except Exception:
        pass


def ensure_capture(page: str) -> None:
    try:
        run(["capture", "start", "--page", page], timeout=30)
    except Exception:
        pass


def percentile(sorted_vals: list[float], p: float) -> float | None:
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    k = (len(sorted_vals) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_vals[int(k)]
    return sorted_vals[f] * (c - k) + sorted_vals[c] * (k - f)


def stats(vals: list[float | int | None]) -> dict:
    clean = [float(v) for v in vals if v is not None]
    clean_sorted = sorted(clean)
    return {
        "n": len(clean),
        "raw": clean,
        "median": percentile(clean_sorted, 0.5),
        "p25": percentile(clean_sorted, 0.25),
        "p75": percentile(clean_sorted, 0.75),
    }


def measure_teacher_hard(results: dict) -> None:
    page = TEACHER
    ensure_capture(page)
    for name, path in TEACHER_ROUTES:
        key = f"teacher.hard.{name}"
        samples = []
        print(f"== hard teacher {name} x{N}", flush=True)
        for i in range(N):
            reset_capture(page)
            goto(page, path)
            timing = collect_nav_timing(page)
            has418 = console_has_418(page)
            sample = {**timing, "react418": has418, "i": i}
            samples.append(sample)
            print(f"  [{i}] ttfb={timing.get('ttfb')} dcl={timing.get('dcl')} load={timing.get('load')} fcp={timing.get('fcp')} 418={has418}", flush=True)
            results[key] = {
                "route": name,
                "path": path,
                "samples": samples,
                "ttfb": stats([s.get("ttfb") for s in samples]),
                "responseEnd": stats([s.get("responseEnd") for s in samples]),
                "dcl": stats([s.get("dcl") for s in samples]),
                "load": stats([s.get("load") for s in samples]),
                "fcp": stats([s.get("fcp") for s in samples]),
                "wall_duration": stats([s.get("duration") for s in samples]),
                "react418_yes": sum(1 for s in samples if s.get("react418")),
            }
            save(results)


def measure_teacher_soft(results: dict) -> None:
    page = TEACHER
    ensure_capture(page)
    # Warm: land on /teacher with class
    goto(page, f"/teacher?class={CLASS}")
    for name, path in TEACHER_ROUTES:
        key = f"teacher.soft.{name}"
        samples = []
        print(f"== soft teacher {name} x{N}", flush=True)
        for i in range(N):
            # ensure we start from a different peer route so soft nav is real
            peers = [p for n, p in TEACHER_ROUTES if n != name]
            start_path = peers[i % len(peers)]
            goto(page, start_path)  # hard land on start (establishes SPA)
            # now soft-nav via click to target
            # After hard goto, Next still uses client links for soft nav
            wall = soft_click_nav(page, name)
            rsc = collect_rsc(page)
            primary = rsc.get("primaryRsc") or {}
            sample = {
                "i": i,
                "from": start_path,
                "wall_ms": round(wall),
                "primary_rsc_ms": primary.get("duration"),
                "primary_rsc_transfer": primary.get("transferSize"),
                "primary_rsc_encoded": primary.get("encodedBodySize"),
                "primary_rsc_url": (primary.get("name") or "")[:160],
                "peer_count": rsc.get("peerCount"),
                "url": rsc.get("url"),
                "all_rsc": rsc.get("all"),
            }
            samples.append(sample)
            print(
                f"  [{i}] wall={sample['wall_ms']} rsc={sample['primary_rsc_ms']} "
                f"body={sample['primary_rsc_encoded']} peers={sample['peer_count']}",
                flush=True,
            )
        results[key] = {
            "route": name,
            "path": path,
            "samples": samples,
            "primary_rsc_ms": stats([s.get("primary_rsc_ms") for s in samples]),
            "primary_rsc_encoded": stats([s.get("primary_rsc_encoded") for s in samples]),
            "soft_wall_ms": stats([s.get("wall_ms") for s in samples]),
            "peer_count": stats([s.get("peer_count") for s in samples]),
        }
        save(results)


def measure_student_hard(results: dict) -> None:
    page = STUDENT
    ensure_capture(page)
    for route in STUDENT_ROUTES:
        key = f"student.hard.{route}"
        samples = []
        print(f"== hard student {route} x{N}", flush=True)
        for i in range(N):
            reset_capture(page)
            goto(page, route)
            timing = collect_nav_timing(page)
            has418 = console_has_418(page)
            sample = {**timing, "react418": has418, "i": i}
            samples.append(sample)
            print(f"  [{i}] ttfb={timing.get('ttfb')} dcl={timing.get('dcl')} fcp={timing.get('fcp')} load={timing.get('load')} 418={has418}", flush=True)
        results[key] = {
            "route": route,
            "samples": samples,
            "ttfb": stats([s.get("ttfb") for s in samples]),
            "responseEnd": stats([s.get("responseEnd") for s in samples]),
            "dcl": stats([s.get("dcl") for s in samples]),
            "load": stats([s.get("load") for s in samples]),
            "fcp": stats([s.get("fcp") for s in samples]),
            "wall_duration": stats([s.get("duration") for s in samples]),
            "react418_yes": sum(1 for s in samples if s.get("react418")),
        }
        save(results)


def measure_student_soft_peers(results: dict) -> None:
    page = STUDENT
    ensure_capture(page)
    for route in STUDENT_ROUTES:
        key = f"student.soft.{route}"
        samples = []
        print(f"== soft student {route} x{N}", flush=True)
        for i in range(N):
            peers = [r for r in STUDENT_ROUTES if r != route]
            start = peers[i % len(peers)]
            goto(page, start)
            try:
                wall = soft_click_nav(page, route)
            except Exception as e:
                print(f"  soft click failed ({e}); fallback goto for peer count context", flush=True)
                goto(page, route)
                wall = None
                rsc = {"peerCount": None, "primaryRsc": None, "all": [], "url": eval_js(page, "location.href")}
                samples.append({"i": i, "error": str(e), "wall_ms": wall, "peer_count": None})
                continue
            rsc = collect_rsc(page)
            primary = rsc.get("primaryRsc") or {}
            sample = {
                "i": i,
                "from": start,
                "wall_ms": round(wall) if wall is not None else None,
                "primary_rsc_ms": primary.get("duration"),
                "primary_rsc_encoded": primary.get("encodedBodySize"),
                "peer_count": rsc.get("peerCount"),
                "url": rsc.get("url"),
                "react418": console_has_418(page),
            }
            samples.append(sample)
            print(f"  [{i}] wall={sample['wall_ms']} rsc={sample['primary_rsc_ms']} peers={sample['peer_count']} 418={sample['react418']}", flush=True)
        results[key] = {
            "route": route,
            "samples": samples,
            "primary_rsc_ms": stats([s.get("primary_rsc_ms") for s in samples]),
            "soft_wall_ms": stats([s.get("wall_ms") for s in samples]),
            "peer_count": stats([s.get("peer_count") for s in samples]),
            "react418_yes": sum(1 for s in samples if s.get("react418")),
        }
        save(results)


def find_quiz_intro(results: dict) -> None:
    page = STUDENT
    print("== student quiz-take intro", flush=True)
    goto(page, "/quizzes")
    raw = eval_js(
        page,
        """
JSON.stringify(Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => h && (h.includes('quiz') || h.includes('take') || h.includes('attempt'))).slice(0, 40))
""",
    )
    hrefs = json.loads(raw) if isinstance(raw, str) else raw
    results["student.quiz_links"] = hrefs
    save(results)
    # pick first plausible intro URL
    pick = None
    for h in hrefs or []:
        if "/quiz" in h and "teacher" not in h:
            pick = h
            break
    if not pick:
        # try buttons / cards via text read
        print(f"  quiz hrefs: {hrefs}", flush=True)
        results["student.quiz_intro"] = {"available": False, "hrefs": hrefs}
        save(results)
        return
    samples = []
    for i in range(N):
        goto(page, pick if pick.startswith("/") else "/" + pick)
        # do not submit — just intro
        timing = collect_nav_timing(page)
        has418 = console_has_418(page)
        samples.append({**timing, "react418": has418, "i": i, "url": eval_js(page, "location.href")})
        print(f"  quiz intro [{i}] {samples[-1].get('url')} ttfb={timing.get('ttfb')} 418={has418}", flush=True)
    results["student.hard.quiz_intro"] = {
        "route": pick,
        "samples": samples,
        "ttfb": stats([s.get("ttfb") for s in samples]),
        "dcl": stats([s.get("dcl") for s in samples]),
        "load": stats([s.get("load") for s in samples]),
        "fcp": stats([s.get("fcp") for s in samples]),
        "wall_duration": stats([s.get("duration") for s in samples]),
        "react418_yes": sum(1 for s in samples if s.get("react418")),
    }
    save(results)


def save(results: dict) -> None:
    OUT.write_text(json.dumps(results, indent=2))


def main() -> None:
    results: dict = {
        "meta": {
            "base": BASE,
            "class_label": "9A2",
            "class_id": CLASS,
            "teacher_profile": "03183047-c3c1-4f01-b79b-36f32a7329ce",
            "student_profile": "4d2a68b3-225f-4baa-b24e-faaa6dd92942",
            "n": N,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    }
    if OUT.exists():
        try:
            results = json.loads(OUT.read_text())
        except Exception:
            pass

    phases = sys.argv[1:] or ["teacher_hard", "teacher_soft", "student_hard", "student_soft", "quiz"]
    for phase in phases:
        if phase == "teacher_hard":
            measure_teacher_hard(results)
        elif phase == "teacher_soft":
            measure_teacher_soft(results)
        elif phase == "student_hard":
            measure_student_hard(results)
        elif phase == "student_soft":
            measure_student_soft_peers(results)
        elif phase == "quiz":
            find_quiz_intro(results)
        else:
            raise SystemExit(f"unknown phase {phase}")
    results.setdefault("meta", {})["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save(results)
    print(f"Wrote {OUT}", flush=True)


if __name__ == "__main__":
    main()
