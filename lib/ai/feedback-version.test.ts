import { describe, expect, it } from 'vitest'
import { readFeedbackVersion } from '@/lib/ai/feedback-version'

describe('readFeedbackVersion', () => {
  it('reads numeric feedbackVersion from JSON', () => {
    expect(readFeedbackVersion(null)).toBeNull()
    expect(readFeedbackVersion('{"praise":"x"}')).toBeNull()
    expect(readFeedbackVersion('{"feedbackVersion":42}')).toBe(42)
    expect(readFeedbackVersion('not-json')).toBeNull()
  })
})
