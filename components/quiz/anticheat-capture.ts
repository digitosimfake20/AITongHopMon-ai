'use client'

/**
 * Quiz-take wiring for Phase 2 whole-monitor capture.
 * Starts only when consent was `granted` and monitoring is enabled.
 */

import { toast } from 'sonner'
import { uploadAnticheatEvidenceAction } from '@/app/actions/anticheat'
import {
  MONITOR_REQUIRED_MESSAGE,
  createCaptureLoop,
  openMonitorCapture,
  type CaptureLoopOpts,
  type GetDisplayMediaFn,
} from '@/lib/anticheat'
import { getMonitoredAttemptId } from '@/components/quiz/anticheat-attempt-session'

export type AnticheatCaptureHandle = {
  dispose: () => void
}

const TRIGGER_TOAST: Record<string, string> = {
  frozen: 'Phát hiện màn hình đứng yên lâu — đã ghi nhận để giáo viên xem',
  tab_switch: 'Phát hiện thay đổi màn hình lớn — đã ghi nhận để giáo viên xem',
  histogram_delta:
    'Phát hiện thay đổi màu sắc màn hình — đã ghi nhận để giáo viên xem',
}

/**
 * Open whole-monitor share and start the ~1fps capture loop.
 * Inject `getDisplayMedia` in tests — never call the real picker in CI.
 *
 * Returns null when share is refused / non-monitor (quiz continues unproctored
 * for capture; no auto-void).
 */
export async function startAnticheatCapture(opts: {
  testId: string
  getDisplayMedia?: GetDisplayMediaFn
  /** Extra loop opts for tests (grabFrame, timers, …). */
  loop?: Partial<CaptureLoopOpts>
}): Promise<AnticheatCaptureHandle | null> {
  const attemptId = getMonitoredAttemptId(opts.testId)
  if (!attemptId) return null

  const share = await openMonitorCapture({
    getDisplayMedia: opts.getDisplayMedia,
  })

  if (!share.ok) {
    toast.error(share.message || MONITOR_REQUIRED_MESSAGE, {
      description: 'Điểm số không bị ảnh hưởng tự động.',
      duration: 8_000,
    })
    return null
  }

  const loop = createCaptureLoop({
    stream: share.stream,
    ...opts.loop,
    reportFlag: async ({ trigger, clientAt, hashWindow, jpegBase64 }) => {
      return uploadAnticheatEvidenceAction({
        attemptId,
        trigger,
        clientAt,
        hashWindow,
        jpegBase64,
      })
    },
    onFlag: (result, trigger) => {
      if (!result.success && result.error === 'evidence_capped') return
      if (!result.success) return
      toast.message(TRIGGER_TOAST[trigger] ?? 'Đã ghi nhận sự kiện giám sát', {
        description: 'Điểm số không bị ảnh hưởng tự động.',
        duration: 5_000,
      })
    },
    onEvidenceCapped: () => {
      toast.message('Đã đủ số lần ghi nhận bằng chứng cho phiên này', {
        description: 'Giám sát vẫn chạy; không tải thêm ảnh bằng chứng.',
        duration: 5_000,
      })
    },
    onError: () => {
      // Non-blocking: capture errors must not interrupt the quiz.
    },
  })

  loop.start()

  return {
    dispose: () => {
      loop.dispose()
    },
  }
}
