#!/usr/bin/env python3
"""Finish quiz-intro hard-nav + React #418 via goto consoleErrors. No product edits."""
from __future__ import annotations

import json
import math
import subprocess
import time
from pathlib import Path

STUDENT = "a1cba943-8b5e-49bd-8d31-3b507eb68e2b"
BASE = "https://aitonghopmon-ai.vercel.app"
QUIZ = "/quiz/take/27077e76-5ec7-4ea6-85ea-0abeebae6590"
ROUTES = ["/dashboard", "/quizzes", "/adaptive", "/roadmap", "/chat", QUIZ]
N = 5
OUT = Path(__file__).resolve().parent / "baseline_extra.json"


def run(args: list[str], timeout: int = 120) -> dict:
    proc = subprocess.run(
        ["orca", *args, "--json"], capture_output=True, text=True, timeout=timeout
    )
    raw = (proc.stdout or proc.stderr or "").strip()
    start = raw.find("{")
    if start < 0:
        raise RuntimeError(f"orca failed {args}: {raw}")
    return json.loads(raw[start:])


def eval_js(page: str, expression: str):
    data = run(["eval", "--page", page, "--expression", expression])
    return data.get("result", {}).get("result")


def percentile(vals: list[float], p: float):
    if not vals:
        return None
    s = sorted(vals)
    if len(s) == 1:
        return s[0]
    k = (len(s) - 1) * p
    f, c = math.floor(k), math.ceil(k)
    if f == c:
        return s[int(k)]
    return s[f] * (c - k) + s[c] * (k - f)


def stats(vals):
    clean = [float(v) for v in vals if v is not None]
    s = sorted(clean)
    return {
        "n": len(clean),
        "raw": clean,
        "median": percentile(s, 0.5),
        "p25": percentile(s, 0.25),
        "p75": percentile(s, 0.75),
    }


def collect_nav(page: str) -> dict:
    raw = None
    for _ in range(6):
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
    responseEnd: n ? Math.round(n.responseEnd) : null,
    dcl: n ? Math.round(n.domContentLoadedEventEnd) : null,
    load: n ? Math.round(n.loadEventEnd) : null,
    fcp: fcp ? Math.round(fcp.startTime) : null,
    duration: n ? Math.round(n.duration) : null,
    title: document.title,
    h1: (document.querySelector('h1')||{}).textContent || null,
  });
})()
""",
        )
        parsed = json.loads(raw) if isinstance(raw, str) else raw
        if parsed and parsed.get("fcp") is not None:
            return parsed
        time.sleep(0.4)
    return json.loads(raw) if isinstance(raw, str) else raw


def goto_with_418(page: str, path: str) -> dict:
    url = BASE + path
    last = None
    for attempt in range(4):
        try:
            data = run(["goto", "--page", page, "--url", url], timeout=120)
            if data.get("ok") is False:
                raise RuntimeError(data.get("error") or data)
            effects = (data.get("result") or {}).get("effects") or {}
            errs = effects.get("consoleErrors") or []
            has418 = any("418" in str(e) for e in errs)
            try:
                run(["wait", "--page", page, "--load", "load"], timeout=60)
            except Exception:
                pass
            time.sleep(1.0)
            href = str(eval_js(page, "location.href") or "")
            if "/login" in href:
                return {
                    "url": href,
                    "react418": has418,
                    "consoleErrors": errs,
                    "login_redirect": True,
                }
            timing = collect_nav(page)
            return {
                **timing,
                "react418": has418,
                "consoleErrors": errs,
                "goto_ok": True,
            }
        except Exception as e:
            last = e
            print(f"  goto retry {attempt+1}: {e}", flush=True)
            time.sleep(2.0 + attempt)
    raise last  # type: ignore


def save(results: dict) -> None:
    OUT.write_text(json.dumps(results, indent=2))


def main() -> None:
    results: dict = {}
    if OUT.exists():
        try:
            results = json.loads(OUT.read_text())
        except Exception:
            results = {}

    # 1) Quiz intro hard-nav
    if not results.get("student.hard.quiz_intro") or len(
        (results.get("student.hard.quiz_intro") or {}).get("samples") or []
    ) < N:
        print("== quiz intro hard x5", flush=True)
        samples = []
        for i in range(N):
            sample = goto_with_418(STUDENT, QUIZ)
            sample["i"] = i
            samples.append(sample)
            print(
                f"  [{i}] url={sample.get('url')} h1={sample.get('h1')!r} "
                f"ttfb={sample.get('ttfb')} dcl={sample.get('dcl')} "
                f"load={sample.get('load')} fcp={sample.get('fcp')} "
                f"418={sample.get('react418')}",
                flush=True,
            )
            if sample.get("login_redirect"):
                raise SystemExit("LOGIN_REDIRECT")
            results["student.hard.quiz_intro"] = {
                "route": QUIZ,
                "note": "Intro 'Sẵn sàng làm bài' — no answer submit",
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

    # 2) React #418 via goto consoleErrors
    r418 = results.setdefault("student.react418_goto", {})
    for route in ROUTES:
        existing = r418.get(route, {}).get("samples") or []
        if len(existing) >= N:
            print(f"-- skip {route} already n={len(existing)}", flush=True)
            continue
        print(f"-- {route}", flush=True)
        samples = list(existing)
        start_i = len(samples)
        for i in range(start_i, N):
            sample = goto_with_418(STUDENT, route)
            sample["i"] = i
            if sample.get("login_redirect"):
                raise SystemExit("LOGIN_REDIRECT")
            samples.append(sample)
            print(
                f"  [{i}] 418={sample.get('react418')} ttfb={sample.get('ttfb')} "
                f"dcl={sample.get('dcl')} fcp={sample.get('fcp')} "
                f"errs={sample.get('consoleErrors')}",
                flush=True,
            )
            r418[route] = {
                "samples": [
                    {
                        "i": s["i"],
                        "react418": s.get("react418"),
                        "url": s.get("url"),
                        "ttfb": s.get("ttfb"),
                        "dcl": s.get("dcl"),
                        "load": s.get("load"),
                        "fcp": s.get("fcp"),
                        "consoleErrors": s.get("consoleErrors"),
                    }
                    for s in samples
                ],
                "react418_yes": sum(1 for s in samples if s.get("react418")),
                "react418_n": len(samples),
                "ttfb": stats([s.get("ttfb") for s in samples]),
                "dcl": stats([s.get("dcl") for s in samples]),
                "load": stats([s.get("load") for s in samples]),
                "fcp": stats([s.get("fcp") for s in samples]),
            }
            results["student.react418_goto"] = r418
            save(results)

    results["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save(results)
    print(f"Wrote {OUT}", flush=True)


if __name__ == "__main__":
    main()
