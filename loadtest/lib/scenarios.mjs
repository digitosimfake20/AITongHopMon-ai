/**
 * Request scenarios derived from Mathz bottleneck hot paths.
 *
 * Public/marketing: no secrets.
 * Student/teacher: only when LOADTEST_COOKIE / LOADTEST_BEARER is set.
 *
 * Optional RSC probes append `?_rsc=1` + `RSC: 1` to approximate soft-nav
 * `text/x-component` flights that historically showed multi-second streams
 * (dashboard, teacher adaptive/students/gaps/assignments, quizzes).
 */

/**
 * @typedef {{ name: string, path: string, weight?: number, auth?: 'none'|'any'|'student'|'teacher', rsc?: boolean }} Target
 */

/** @type {Target[]} */
export const PUBLIC_TARGETS = [
  { name: 'landing', path: '/', weight: 3, auth: 'none' },
  { name: 'login', path: '/login', weight: 2, auth: 'none' },
  { name: 'login-student', path: '/login/student', weight: 1, auth: 'none' },
  { name: 'login-teacher', path: '/login/teacher', weight: 1, auth: 'none' },
  { name: 'signup', path: '/signup', weight: 1, auth: 'none' },
  { name: 'signup-student', path: '/signup/student', weight: 1, auth: 'none' },
  { name: 'signup-teacher', path: '/signup/teacher', weight: 1, auth: 'none' },
]

/** Hot student document GETs (need session cookie). */
/** @type {Target[]} */
export const STUDENT_TARGETS = [
  { name: 'student-dashboard', path: '/dashboard', weight: 4, auth: 'student', rsc: true },
  { name: 'student-quizzes', path: '/quizzes', weight: 3, auth: 'student', rsc: true },
  { name: 'student-adaptive', path: '/adaptive', weight: 3, auth: 'student', rsc: true },
  { name: 'student-roadmap', path: '/roadmap', weight: 2, auth: 'student', rsc: true },
  { name: 'student-chat', path: '/chat', weight: 1, auth: 'student', rsc: true },
]

/** Hot teacher document GETs (need session cookie). */
/** @type {Target[]} */
export const TEACHER_TARGETS = [
  { name: 'teacher-home', path: '/teacher', weight: 3, auth: 'teacher', rsc: true },
  { name: 'teacher-adaptive', path: '/teacher/adaptive', weight: 4, auth: 'teacher', rsc: true },
  { name: 'teacher-students', path: '/teacher/students', weight: 4, auth: 'teacher', rsc: true },
  { name: 'teacher-assignments', path: '/teacher/assignments', weight: 3, auth: 'teacher', rsc: true },
  { name: 'teacher-gaps', path: '/teacher/gaps', weight: 3, auth: 'teacher', rsc: true },
  { name: 'teacher-test-bank', path: '/teacher/test-bank', weight: 1, auth: 'teacher', rsc: true },
]

/**
 * @param {object} opts
 * @param {string} opts.scenario  public | student | teacher | mix | hot
 * @param {boolean} opts.rsc
 * @param {boolean} opts.hasAuth
 * @param {string} [opts.classId]
 */
export function buildPool({ scenario, rsc, hasAuth, classId }) {
  /** @type {Target[]} */
  let pool = []

  switch (scenario) {
    case 'public':
      pool = [...PUBLIC_TARGETS]
      break
    case 'student':
      if (!hasAuth) {
        throw new Error(
          'Scenario "student" needs LOADTEST_COOKIE or LOADTEST_BEARER (see loadtest/README.md).',
        )
      }
      pool = [...STUDENT_TARGETS]
      break
    case 'teacher':
      if (!hasAuth) {
        throw new Error(
          'Scenario "teacher" needs LOADTEST_COOKIE or LOADTEST_BEARER (see loadtest/README.md).',
        )
      }
      pool = [...TEACHER_TARGETS]
      break
    case 'hot':
      // Prefer auth hot paths when available; else public only.
      pool = hasAuth
        ? [...STUDENT_TARGETS, ...TEACHER_TARGETS]
        : [...PUBLIC_TARGETS]
      break
    case 'mix':
    default:
      pool = [...PUBLIC_TARGETS]
      if (hasAuth) {
        pool = pool.concat(STUDENT_TARGETS, TEACHER_TARGETS)
      }
      break
  }

  if (classId) {
    pool = pool.map((t) => {
      if (!t.path.startsWith('/dashboard') && !t.path.startsWith('/teacher')) return t
      const join = t.path.includes('?') ? '&' : '?'
      return { ...t, path: `${t.path}${join}class=${encodeURIComponent(classId)}` }
    })
  }

  // Expand RSC variants when enabled and target marks rsc:true
  if (rsc) {
    const expanded = []
    for (const t of pool) {
      expanded.push(t)
      if (t.rsc) {
        expanded.push({
          ...t,
          name: `${t.name}-rsc`,
          path: withRscQuery(t.path),
          weight: Math.max(1, Math.floor((t.weight ?? 1) / 2)),
          rscProbe: true,
        })
      }
    }
    pool = expanded
  }

  return pool
}

function withRscQuery(path) {
  const join = path.includes('?') ? '&' : '?'
  return `${path}${join}_rsc=1`
}

/**
 * Weighted random pick.
 * @param {Target[]} pool
 */
export function pickTarget(pool) {
  const total = pool.reduce((s, t) => s + (t.weight ?? 1), 0)
  let r = Math.random() * total
  for (const t of pool) {
    r -= t.weight ?? 1
    if (r <= 0) return t
  }
  return pool[pool.length - 1]
}

/**
 * @param {object} config
 * @param {Target} target
 */
export function buildRequest(config, target) {
  const url = new URL(target.path, config.baseUrl)
  /** @type {Record<string, string>} */
  const headers = {
    Accept: target.rscProbe
      ? 'text/x-component'
      : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'Mathz-LoadTest/1.0 (+local harness; contact repo maintainers)',
  }

  if (target.rscProbe) {
    headers.RSC = '1'
    headers['Next-Url'] = target.path.split('?')[0]
  }

  if (config.cookie) {
    headers.Cookie = config.cookie
  }
  if (config.bearer) {
    headers.Authorization = `Bearer ${config.bearer}`
  }

  return { url: url.toString(), headers, name: target.name }
}
