import { beforeEach, describe, expect, it, vi } from 'vitest'

const uploadMock = vi.fn()
const removeMock = vi.fn()
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  remove: removeMock,
}))
const createAdminClientMock = vi.fn(() => ({
  storage: { from: fromMock },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

import {
  ANTICHEAT_EVIDENCE_BUCKET,
  MAX_EVIDENCE_JPEG_BYTES,
  anticheatEvidenceObjectPath,
  decodeJpegBase64,
  removeAnticheatEvidenceObjects,
  stripBase64DataUrlPrefix,
  uploadAnticheatEvidenceObject,
} from '@/lib/supabase/anticheat-storage'

/** Minimal JPEG SOI + a few payload bytes (not a full image). */
function jpegBytes(extra = 8): Buffer {
  return Buffer.from([0xff, 0xd8, ...Array.from({ length: extra }, (_, i) => i)])
}

function jpegBase64(extra = 8): string {
  return jpegBytes(extra).toString('base64')
}

beforeEach(() => {
  uploadMock.mockReset()
  removeMock.mockReset()
  fromMock.mockClear()
  createAdminClientMock.mockClear()
  uploadMock.mockResolvedValue({ error: null })
  removeMock.mockResolvedValue({ error: null })
})

describe('anticheatEvidenceObjectPath', () => {
  it('builds submissionId/flagId.jpg without PII', () => {
    expect(
      anticheatEvidenceObjectPath(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ),
    ).toBe(
      '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
    )
  })
})

describe('stripBase64DataUrlPrefix', () => {
  it('strips data-URL prefix and leaves raw base64 alone', () => {
    expect(stripBase64DataUrlPrefix('data:image/jpeg;base64,abc123')).toBe('abc123')
    expect(stripBase64DataUrlPrefix('  data:image/png;base64,xyz  ')).toBe('xyz')
    expect(stripBase64DataUrlPrefix('abc123')).toBe('abc123')
  })
})

describe('decodeJpegBase64', () => {
  it('accepts raw and data-URL JPEG base64', () => {
    const raw = decodeJpegBase64(jpegBase64())
    expect(raw.ok).toBe(true)
    if (raw.ok) expect(raw.bytes[0]).toBe(0xff)

    const dataUrl = decodeJpegBase64(`data:image/jpeg;base64,${jpegBase64()}`)
    expect(dataUrl.ok).toBe(true)
  })

  it('rejects empty, non-JPEG, and oversized payloads', () => {
    expect(decodeJpegBase64('')).toEqual({ ok: false, error: 'Thiếu jpegBase64' })
    expect(decodeJpegBase64('   ')).toEqual({ ok: false, error: 'Thiếu jpegBase64' })
    expect(decodeJpegBase64(Buffer.from([0x00, 0x01]).toString('base64'))).toEqual({
      ok: false,
      error: 'Payload không phải JPEG',
    })

    const tooBig = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.alloc(MAX_EVIDENCE_JPEG_BYTES),
    ])
    const oversized = decodeJpegBase64(tooBig.toString('base64'))
    expect(oversized.ok).toBe(false)
    if (!oversized.ok) {
      expect(oversized.error).toContain(String(MAX_EVIDENCE_JPEG_BYTES))
    }
  })
})

describe('uploadAnticheatEvidenceObject', () => {
  it('uploads via mocked createAdminClient and returns framePath', async () => {
    const bytes = jpegBytes()
    const result = await uploadAnticheatEvidenceObject({
      submissionId: 'sub-1',
      flagId: 'flag-1',
      bytes,
    })

    expect(result).toEqual({ framePath: 'sub-1/flag-1.jpg' })
    expect(createAdminClientMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith(ANTICHEAT_EVIDENCE_BUCKET)
    expect(uploadMock).toHaveBeenCalledWith('sub-1/flag-1.jpg', bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  })

  it('throws when storage upload returns an error', async () => {
    uploadMock.mockResolvedValueOnce({ error: { message: 'bucket missing' } })
    await expect(
      uploadAnticheatEvidenceObject({
        submissionId: 'sub-1',
        flagId: 'flag-1',
        bytes: jpegBytes(),
      }),
    ).rejects.toThrow('anticheat evidence upload failed: bucket missing')
  })
})

describe('removeAnticheatEvidenceObjects', () => {
  it('returns empty lists without calling storage when paths empty', async () => {
    const result = await removeAnticheatEvidenceObjects([])
    expect(result).toEqual({ removed: [], failed: [] })
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('removes a batch via mocked createAdminClient', async () => {
    const paths = ['a/b.jpg', 'c/d.jpg']
    const result = await removeAnticheatEvidenceObjects(paths)
    expect(result).toEqual({ removed: paths, failed: [] })
    expect(fromMock).toHaveBeenCalledWith(ANTICHEAT_EVIDENCE_BUCKET)
    expect(removeMock).toHaveBeenCalledWith(paths)
  })

  it('throws when storage remove returns an error', async () => {
    removeMock.mockResolvedValueOnce({ error: { message: 'denied' } })
    await expect(removeAnticheatEvidenceObjects(['x.jpg'])).rejects.toThrow(
      'anticheat evidence remove failed: denied',
    )
  })
})
