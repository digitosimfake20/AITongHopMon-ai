'use client'

import dynamic from 'next/dynamic'

/** Keeps localStorage/timer island out of the student-layout SSR/client graph until mount. */
export const ActiveQuizBannerLazy = dynamic(
  () =>
    import('@/components/student/active-quiz-banner').then((m) => ({
      default: m.ActiveQuizBanner,
    })),
  { ssr: false, loading: () => null },
)
