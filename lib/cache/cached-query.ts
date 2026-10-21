import { unstable_cache, updateTag, revalidateTag } from 'next/cache'
import { CacheTags } from '@/lib/cache/tags'

type CacheOptions = {
  keyParts: string[]
  tags: string[]
  /** Seconds until soft expiry (unstable_cache revalidate). */
  revalidate: number
}

/**
 * Wrap a Prisma/read function with Next.js Data Cache.
 * Results are JSON-serialized — return plain objects / ISO strings, not Date/Map/Set.
 */
export function cachedQuery<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: CacheOptions,
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => {
    const key = [
      ...options.keyParts,
      ...args.map((a) => (a == null ? 'null' : String(a))),
    ]
    return unstable_cache(() => fn(...args), key, {
      tags: options.tags,
      revalidate: options.revalidate,
    })()
  }
}

/**
 * Immediate invalidation from Server Actions (read-your-own-writes).
 * Falls back to revalidateTag SWR if updateTag is unavailable.
 */
export function bustCacheTags(...tags: string[]) {
  const unique = [...new Set(tags.filter(Boolean))]
  for (const tag of unique) {
    try {
      updateTag(tag)
    } catch {
      try {
        revalidateTag(tag, 'max')
      } catch {
        // Older Next / non-action contexts — ignore
      }
    }
  }
}

/** Class-scoped bust after assign / submit / roster. */
export function bustClassCaches(classId: string, opts?: { studentId?: string }) {
  const tags = [
    CacheTags.teacherDash(classId),
    CacheTags.packages(classId),
    CacheTags.adaptive(classId),
    CacheTags.classGap(classId),
    CacheTags.students(classId),
    CacheTags.submissions(classId),
    CacheTags.quizBank(classId),
  ]
  if (opts?.studentId) {
    tags.push(
      CacheTags.quizBankStudent(classId, opts.studentId),
      CacheTags.studentDash(opts.studentId),
      CacheTags.knowledge(opts.studentId),
    )
  }
  bustCacheTags(...tags)
}
