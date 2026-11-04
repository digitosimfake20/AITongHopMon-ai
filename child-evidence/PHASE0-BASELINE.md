# Phase 0 — Measurement baseline (Mathz remediation)

**Scope:** analysis/evidence only — no product code changes.

## Session meta

| field | value |
|---|---|
| base | https://aitonghopmon-ai.vercel.app |
| class | 9A2 (`4eb54d69-b919-47b3-bd8b-436a24736ded`) |
| teacher profile | `03183047-c3c1-4f01-b79b-36f32a7329ce` |
| student profile | `4d2a68b3-225f-4baa-b24e-faaa6dd92942` |
| samples per metric | n≥5 |
| collection started (UTC) | 2026-11-04T06:08:06Z |
| extra pass finished (UTC) | 2026-11-04T09:36:33Z |
| raw evidence | `evidence/baseline_raw.json`, `evidence/baseline_extra.json` |

### Method notes

- **Hard nav:** `orca goto` + Navigation Timing (`responseStart` as TTFB from nav start, DCL, load, FCP when paint entry present, duration as wall).
- **Soft nav:** hard-land on a peer route, then client `<a>` click; primary `_rsc` from Resource Timing (`duration`, `encodedBodySize`); soft wall = click→URL+peer settle; peer count = `#` of `_rsc` resource entries after settle.
- **React #418:** early `orca console` capture under-detected; authoritative pass uses **`goto` `effects.consoleErrors`** (see Student React #418 section). Message: `Minified React error #418` with `args[]=text` (hydration text mismatch).
- **FCP:** intermittent in Orca browser paint buffer after hard nav; many teacher hard samples lack FCP (`—`). Student #418 re-pass often captured FCP.
- **EXPLAIN:** not possible without DB access — not invented.
- **Quiz intro:** `/quiz/take/27077e76-5ec7-4ea6-85ea-0abeebae6590` stayed on **Sẵn sàng làm bài** (no submit).

## Teacher — hard navigation

### Routes

**/teacher** (`/teacher?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 60, 61, 67, 58, 40 | 60 | 58 | 61 |
| responseEnd | 5 | 3708, 2798, 2847, 3145, 2839 | 2847 | 2839 | 3145 |
| dcl | 5 | 3729, 2812, 2866, 3161, 2853 | 2866 | 2853 | 3161 |
| load | 5 | 3808, 2882, 2945, 3242, 2894 | 2945 | 2894 | 3242 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 3808, 2882, 2945, 3242, 2894 | 2945 | 2894 | 3242 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/teacher/adaptive** (`/teacher/adaptive?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 39, 42, 47, 42, 41 | 42 | 41 | 42 |
| responseEnd | 5 | 6048, 4919, 5275, 4917, 5324 | 5275 | 4919 | 5324 |
| dcl | 5 | 6074, 4934, 5300, 4944, 5342 | 5300 | 4944 | 5342 |
| load | 5 | 6144, 4998, 5362, 5019, 5413 | 5362 | 5019 | 5413 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 6144, 4998, 5362, 5019, 5413 | 5362 | 5019 | 5413 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/teacher/students** (`/teacher/students?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 41, 38, 39, 62, 44 | 41 | 39 | 44 |
| responseEnd | 5 | 4804, 4706, 4763, 4704, 4951 | 4763 | 4706 | 4804 |
| dcl | 5 | 4841, 4717, 4793, 4719, 4974 | 4793 | 4719 | 4841 |
| load | 5 | 4856, 4727, 4849, 4785, 5040 | 4849 | 4785 | 4856 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 4856, 4727, 4849, 4785, 5040 | 4849 | 4785 | 4856 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/teacher/assignments** (`/teacher/assignments?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 51, 86, 45, 80, 38 | 51 | 45 | 80 |
| responseEnd | 5 | 2913, 4376, 2852, 3072, 2965 | 2965 | 2913 | 3072 |
| dcl | 5 | 2950, 4391, 2876, 3089, 3006 | 3006 | 2950 | 3089 |
| load | 5 | 3004, 4454, 2913, 3141, 3078 | 3078 | 3004 | 3141 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 3004, 4454, 2913, 3141, 3078 | 3078 | 3004 | 3141 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/teacher/gaps** (`/teacher/gaps?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 39, 40, 38, 43, 43 | 40 | 39 | 43 |
| responseEnd | 5 | 2945, 4926, 5316, 4424, 2834 | 4424 | 2945 | 4926 |
| dcl | 5 | 2968, 4945, 5333, 4438, 2856 | 4438 | 2968 | 4945 |
| load | 5 | 3084, 5007, 5381, 4492, 2915 | 4492 | 3084 | 5007 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 3084, 5007, 5381, 4492, 2915 | 4492 | 3084 | 5007 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/teacher/test-bank** (`/teacher/test-bank?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 54, 56, 44, 56, 46 | 54 | 46 | 56 |
| responseEnd | 5 | 3122, 2871, 3191, 3203, 2851 | 3122 | 2871 | 3191 |
| dcl | 5 | 3142, 2900, 3208, 3213, 2874 | 3142 | 2900 | 3208 |
| load | 5 | 3190, 3000, 3259, 3228, 2929 | 3190 | 3000 | 3228 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 3190, 3000, 3259, 3228, 2929 | 3190 | 3000 | 3228 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

## Teacher — soft navigation (`_rsc`)

### Routes

**/teacher** (`/teacher?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 4 | 333, 527, 2579, 506 | 516.5 | 462.8 | 1040 |
| primary_rsc_encoded (bytes) | 4 | 1052, 1025, 187, 154 | 606 | 178.8 | 1031.8 |
| soft_wall_ms (ms) | 5 | 3608, 4379, 2321, 13974, 2194 | 3608 | 2321 | 4379 |
| peer_count (count) | 5 | 16, 26, 6, 0, 2 | 6 | 2 | 16 |

_Note: primary `_rsc` missing on sample indices [3] (likely cache/no flight recorded)._

- primary `_rsc` ms raw: [333, 527, 2579, None, 506]
- peer `_rsc` count raw: [16, 26, 6, 0, 2]

**/teacher/adaptive** (`/teacher/adaptive?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 5284, 546, 351, 555, 340 | 546 | 351 | 555 |
| primary_rsc_encoded (bytes) | 5 | 1658, 188, 155, 155, 155 | 155 | 155 | 188 |
| soft_wall_ms (ms) | 5 | 8888, 9432, 9256, 9165, 7711 | 9165 | 8888 | 9256 |
| peer_count (count) | 5 | 11, 32, 9, 7, 7 | 9 | 7 | 11 |

- primary `_rsc` ms raw: [5284, 546, 351, 555, 340]
- peer `_rsc` count raw: [11, 32, 9, 7, 7]

**/teacher/students** (`/teacher/students?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 4834, 4592, 4442, 4438, 4478 | 4478 | 4442 | 4592 |
| primary_rsc_encoded (bytes) | 5 | 4751, 4752, 4750, 4753, 4749 | 4751 | 4750 | 4752 |
| soft_wall_ms (ms) | 5 | 7147, 6845, 6658, 6910, 6799 | 6845 | 6799 | 6910 |
| peer_count (count) | 5 | 1, 1, 2, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [4834, 4592, 4442, 4438, 4478]
- peer `_rsc` count raw: [1, 1, 2, 1, 1]

**/teacher/assignments** (`/teacher/assignments?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 5204, 2990, 3009, 4326, 2897 | 3009 | 2990 | 4326 |
| primary_rsc_encoded (bytes) | 5 | 1854, 1856, 1855, 1854, 1853 | 1854 | 1854 | 1855 |
| soft_wall_ms (ms) | 5 | 7279, 5181, 5128, 6635, 5108 | 5181 | 5128 | 6635 |
| peer_count (count) | 5 | 1, 1, 1, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [5204, 2990, 3009, 4326, 2897]
- peer `_rsc` count raw: [1, 1, 1, 1, 1]

**/teacher/gaps** (`/teacher/gaps?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 2801, 2754, 3001, 2826, 2859 | 2826 | 2801 | 2859 |
| primary_rsc_encoded (bytes) | 5 | 4544, 4474, 4543, 4545, 4542 | 4543 | 4542 | 4544 |
| soft_wall_ms (ms) | 5 | 5238, 4888, 5086, 4993, 4994 | 4994 | 4993 | 5086 |
| peer_count (count) | 5 | 1, 1, 1, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [2801, 2754, 3001, 2826, 2859]
- peer `_rsc` count raw: [1, 1, 1, 1, 1]

**/teacher/test-bank** (`/teacher/test-bank?class=4eb54d69-b919-47b3-bd8b-436a24736ded`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 2855, 2832, 2664, 2843, 2689 | 2832 | 2689 | 2843 |
| primary_rsc_encoded (bytes) | 5 | 5027, 5025, 5026, 5025, 5026 | 5026 | 5025 | 5026 |
| soft_wall_ms (ms) | 5 | 5020, 5204, 4718, 4958, 5077 | 5020 | 4958 | 5077 |
| peer_count (count) | 5 | 1, 7, 1, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [2855, 2832, 2664, 2843, 2689]
- peer `_rsc` count raw: [1, 7, 1, 1, 1]

## Student — hard navigation

### Shell routes (initial pass)

**/dashboard** (`/dashboard`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 128, 39, 45, 42, 40 | 42 | 40 | 45 |
| responseEnd | 5 | 4318, 3164, 3337, 3396, 3272 | 3337 | 3272 | 3396 |
| dcl | 5 | 4348, 3189, 3358, 3411, 3297 | 3358 | 3297 | 3411 |
| load | 5 | 4414, 3225, 3400, 3493, 3331 | 3400 | 3331 | 3493 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 4414, 3225, 3400, 3493, 3331 | 3400 | 3331 | 3493 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/quizzes** (`/quizzes`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 39, 39, 41, 46, 52 | 41 | 39 | 46 |
| responseEnd | 5 | 3209, 3255, 4100, 3163, 3533 | 3255 | 3209 | 3533 |
| dcl | 5 | 3235, 3270, 4118, 3181, 3545 | 3270 | 3235 | 3545 |
| load | 5 | 3288, 3323, 4152, 3345, 3613 | 3345 | 3323 | 3613 |
| fcp | 0 | — | — | — | — |
| wall_duration | 5 | 3288, 3323, 4152, 3345, 3613 | 3345 | 3323 | 3613 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/adaptive** (`/adaptive`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 41, 40, 40, 39, 41 | 40 | 40 | 41 |
| responseEnd | 5 | 4798, 5795, 4833, 5969, 4787 | 4833 | 4798 | 5795 |
| dcl | 5 | 4817, 5812, 4846, 5986, 4811 | 4846 | 4817 | 5812 |
| load | 5 | 4861, 5853, 4906, 6022, 4862 | 4906 | 4862 | 5853 |
| fcp | 4 | 8024, 4884, 11680, 4864 | 6454 | 4879 | 8938 |
| wall_duration | 5 | 4861, 5853, 4906, 6022, 4862 | 4906 | 4862 | 5853 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/roadmap** (`/roadmap`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 41, 40, 47, 42, 39 | 41 | 40 | 42 |
| responseEnd | 5 | 4795, 4635, 4776, 4799, 4636 | 4776 | 4636 | 4795 |
| dcl | 5 | 4815, 4645, 4794, 4825, 4649 | 4794 | 4649 | 4815 |
| load | 5 | 4864, 4700, 4830, 4867, 4715 | 4830 | 4715 | 4864 |
| fcp | 1 | 5848 | 5848 | 5848 | 5848 |
| wall_duration | 5 | 4864, 4700, 4830, 4867, 4715 | 4830 | 4715 | 4864 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

**/chat** (`/chat`)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 40, 40, 46, 39, 38 | 40 | 39 | 40 |
| responseEnd | 5 | 3367, 3392, 3501, 3374, 3518 | 3392 | 3374 | 3501 |
| dcl | 5 | 3376, 3411, 3515, 3391, 3535 | 3411 | 3391 | 3515 |
| load | 5 | 3376, 3468, 3579, 3433, 3598 | 3468 | 3433 | 3579 |
| fcp | 2 | 3956, 5340 | 4648 | 4302 | 4994 |
| wall_duration | 5 | 3376, 3468, 3579, 3433, 3598 | 3468 | 3433 | 3579 |
| react418 (orca console capture) | 5 | yes=0/5 | — | — | — |

### Quiz-take intro (hard nav, no submit)

**/quiz/take/27077e76-5ec7-4ea6-85ea-0abeebae6590** — Intro 'Sẵn sàng làm bài' — no answer submit

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 150, 51, 50, 97, 82 | 82 | 51 | 97 |
| responseEnd | 5 | 5603, 4919, 4520, 4406, 4561 | 4561 | 4520 | 4919 |
| dcl | 5 | 5639, 4971, 4587, 4433, 4600 | 4600 | 4587 | 4971 |
| load | 5 | 5672, 5009, 4627, 4454, 4627 | 4627 | 4627 | 5009 |
| fcp | 5 | 5740, 5108, 4692, 4516, 4732 | 4732 | 4692 | 5108 |
| wall_duration | 5 | 5672, 5009, 4627, 4454, 4627 | 4627 | 4627 | 5009 |
| react418 (goto consoleErrors) | 5 | yes=0/5 | — | — | — |

## Student — soft navigation (peer `_rsc`)

### Shell routes

**/dashboard** (`/dashboard`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 3264, 607, 2954, 3345, 3151 | 3151 | 2954 | 3264 |
| primary_rsc_encoded (bytes) | 0 | — | — | — | — |
| soft_wall_ms (ms) | 5 | 5231, 6276, 4960, 5593, 5250 | 5250 | 5231 | 5593 |
| peer_count (count) | 5 | 1, 8, 1, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [3264, 607, 2954, 3345, 3151]
- peer `_rsc` count raw: [1, 8, 1, 1, 1]

**/quizzes** (`/quizzes`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 3207, 2926, 4609, 2998, 7171 | 3207 | 2998 | 4609 |
| primary_rsc_encoded (bytes) | 0 | — | — | — | — |
| soft_wall_ms (ms) | 5 | 5217, 6374, 6761, 5115, 9155 | 6374 | 5217 | 6761 |
| peer_count (count) | 5 | 1, 10, 1, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [3207, 2926, 4609, 2998, 7171]
- peer `_rsc` count raw: [1, 10, 1, 1, 1]

**/adaptive** (`/adaptive`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 4620, 4730, 4712, 4827, 8859 | 4730 | 4712 | 4827 |
| primary_rsc_encoded (bytes) | 0 | — | — | — | — |
| soft_wall_ms (ms) | 5 | 6781, 8226, 8884, 8948, 13033 | 8884 | 8226 | 8948 |
| peer_count (count) | 5 | 1, 20, 11, 11, 11 | 11 | 11 | 11 |

- primary `_rsc` ms raw: [4620, 4730, 4712, 4827, 8859]
- peer `_rsc` count raw: [1, 20, 11, 11, 11]

**/roadmap** (`/roadmap`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 4639, 4642, 4637, 4794, 8168 | 4642 | 4639 | 4794 |
| primary_rsc_encoded (bytes) | 0 | — | — | — | — |
| soft_wall_ms (ms) | 5 | 7178, 7394, 7323, 7318, 10595 | 7323 | 7318 | 7394 |
| peer_count (count) | 5 | 1, 1, 1, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [4639, 4642, 4637, 4794, 8168]
- peer `_rsc` count raw: [1, 1, 1, 1, 1]

**/chat** (`/chat`)

| metric | n | raw samples | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| primary_rsc_ms (ms) | 5 | 316, 352, 388, 325, 533 | 352 | 325 | 388 |
| primary_rsc_encoded (bytes) | 0 | — | — | — | — |
| soft_wall_ms (ms) | 5 | 3419, 3223, 3155, 3010, 3137 | 3155 | 3137 | 3223 |
| peer_count (count) | 5 | 1, 1, 1, 1, 1 | 1 | 1 | 1 |

- primary `_rsc` ms raw: [316, 352, 388, 325, 533]
- peer `_rsc` count raw: [1, 1, 1, 1, 1]

## Student — React #418 (authoritative: goto consoleErrors)

| route | n | yes/n | per-sample |
|---|---:|---:|---|
| `/dashboard` | 5 | 5/5 | Y, Y, Y, Y, Y |
| `/quizzes` | 5 | 5/5 | Y, Y, Y, Y, Y |
| `/adaptive` | 5 | 5/5 | Y, Y, Y, Y, Y |
| `/roadmap` | 5 | 5/5 | Y, Y, Y, Y, Y |
| `/chat` | 5 | 5/5 | Y, Y, Y, Y, Y |
| `/quiz/take/27077e76-5ec7-4ea6-85ea-0abeebae6590` | 5 | 0/5 | N, N, N, N, N |

Hard-nav timing collected during the same #418 pass (bonus; FCP more often present):

**/dashboard** (during #418 pass)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 62, 69, 50, 59, 52 | 59 | 52 | 62 |
| dcl | 5 | 3516, 5358, 3417, 4470, 4500 | 4470 | 3516 | 4500 |
| load | 5 | 3526, 5412, 3473, 4530, 4586 | 4530 | 3526 | 4586 |
| fcp | 5 | 3576, 5440, 3464, 4528, 4580 | 4528 | 3576 | 4580 |

**/quizzes** (during #418 pass)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 97, 52, 122, 46, 70 | 70 | 52 | 97 |
| dcl | 5 | 3517, 3348, 3242, 3442, 3556 | 3442 | 3348 | 3517 |
| load | 5 | 3565, 3476, 3302, 3583, 3653 | 3565 | 3476 | 3583 |
| fcp | 5 | 3568, 3396, 3288, 3476, 3588 | 3476 | 3396 | 3568 |

**/adaptive** (during #418 pass)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 70, 73, 47, 63, 49 | 63 | 49 | 70 |
| dcl | 5 | 4753, 5236, 5159, 5249, 4909 | 5159 | 4909 | 5236 |
| load | 5 | 4826, 5312, 5295, 5381, 4984 | 5295 | 4984 | 5312 |
| fcp | 5 | 4816, 5304, 5192, 5280, 4956 | 5192 | 4956 | 5280 |

**/roadmap** (during #418 pass)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 58, 40, 95, 44, 41 | 44 | 41 | 58 |
| dcl | 5 | 4881, 6603, 4835, 5033, 4828 | 4881 | 4835 | 5033 |
| load | 5 | 5019, 6705, 4888, 5060, 4877 | 5019 | 4888 | 5060 |
| fcp | 5 | 4980, 7708, 4892, 5084, 4872 | 4980 | 4892 | 5084 |

**/chat** (during #418 pass)

| metric | n | raw samples (ms) | median | p25 | p75 |
|---|---:|---|---:|---:|---:|
| ttfb | 5 | 47, 50, 51, 50, 45 | 50 | 47 | 50 |
| dcl | 5 | 3583, 3179, 3236, 3726, 3500 | 3500 | 3236 | 3583 |
| load | 5 | 3640, 3297, 3282, 3819, 3525 | 3525 | 3297 | 3640 |
| fcp | 5 | 3636, 3288, 3336, 3764, 3540 | 3540 | 3336 | 3636 |

## Headline medians (quick reference)

### Teacher soft `_rsc` duration (ms)

| route | n | median | p25 | p75 | median encoded body (B) | median peers |
|---|---:|---:|---:|---:|---:|---:|
| `/teacher` | 4 | 516.5 | 462.8 | 1040 | 606 | 6 |
| `/teacher/adaptive` | 5 | 546 | 351 | 555 | 155 | 9 |
| `/teacher/students` | 5 | 4478 | 4442 | 4592 | 4751 | 1 |
| `/teacher/assignments` | 5 | 3009 | 2990 | 4326 | 1854 | 1 |
| `/teacher/gaps` | 5 | 2826 | 2801 | 2859 | 4543 | 1 |
| `/teacher/test-bank` | 5 | 2832 | 2689 | 2843 | 5026 | 1 |

### Teacher hard DCL (ms)

| route | n | median DCL | median load | median TTFB |
|---|---:|---:|---:|---:|
| `/teacher` | 5 | 2866 | 2945 | 60 |
| `/teacher/adaptive` | 5 | 5300 | 5362 | 42 |
| `/teacher/students` | 5 | 4793 | 4849 | 41 |
| `/teacher/assignments` | 5 | 3006 | 3078 | 51 |
| `/teacher/gaps` | 5 | 4438 | 4492 | 40 |
| `/teacher/test-bank` | 5 | 3142 | 3190 | 54 |

### Student hard DCL (ms) — initial pass

| route | n | median DCL | median load | median TTFB |
|---|---:|---:|---:|---:|
| `/dashboard` | 5 | 3358 | 3400 | 42 |
| `/quizzes` | 5 | 3270 | 3345 | 41 |
| `/adaptive` | 5 | 4846 | 4906 | 40 |
| `/roadmap` | 5 | 4794 | 4830 | 41 |
| `/chat` | 5 | 3411 | 3468 | 40 |
| `/quiz/take/27077e76-5ec7-4ea6-85ea-0abeebae6590` (intro) | 5 | 4600 | 4627 | 82 |

### Student soft `_rsc` / peers

| route | n | median `_rsc` ms | median soft wall | median peers |
|---|---:|---:|---:|---:|
| `/dashboard` | 5 | 3151 | 5250 | 1 |
| `/quizzes` | 5 | 3207 | 6374 | 1 |
| `/adaptive` | 5 | 4730 | 8884 | 11 |
| `/roadmap` | 5 | 4642 | 7323 | 1 |
| `/chat` | 5 | 352 | 3155 | 1 |

## Likely React #418 sources (read-only code skim)

Hydration error `#418` with `args[]=text` means server-rendered text did not match the first client render. Observed on student shell routes (`/dashboard`, `/quizzes`, `/adaptive`, `/roadmap`, `/chat`) at **5/5** hard navigations; **not** observed on quiz-take intro (0/5).

Strong candidate (shared student shell header):

- `components/dashboard/dashboard-greeting.tsx` — `'use client'` but still SSR’d; `getGreeting()` uses `new Date().getHours()` so server timezone (often UTC on Vercel) can disagree with the browser local hour (“Chào buổi sáng/chiều/tối”), producing a **text** mismatch. Used from `components/dashboard/dashboard-header.tsx` on shell pages; quiz-take intro does not use that header (matches 0/5 #418 there).

Other date/locale text to inspect if greeting is ruled out:

- `components/student/quiz-card.tsx` — `toLocaleString('vi-VN', …)` for deadlines.
- `components/student/knowledge-roadmap.tsx` — `toLocaleDateString('vi-VN')`.
- No product fixes applied in Phase 0.

## Gaps / not done

- No DB EXPLAIN (no database access).
- Teacher hard-nav FCP mostly unavailable in paint buffer for that pass.
- Initial student `orca console` #418 flags were false negatives; use goto `consoleErrors` numbers above.
- Optional deeper #418 file localization deferred; remediation is out of Phase 0 scope.
