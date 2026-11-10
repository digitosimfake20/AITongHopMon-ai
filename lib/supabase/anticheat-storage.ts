import { createAdminClient } from '@/lib/supabase/admin'

/** Private bucket for anticheat JPEG frames (service-role uploads only). */
export const ANTICHEAT_EVIDENCE_BUCKET =
  process.env.ANTICHEAT_EVIDENCE_BUCKET?.trim() || 'anticheat-evidence'

/** Reject decoded JPEG payloads larger than this (bytes). */
export const MAX_EVIDENCE_JPEG_BYTES = 768 * 1024 // 768 KiB (~0.75 MB)

/**
 * Object path scheme (no PII beyond UUIDs):
 *   `{submissionId}/{flagId}.jpg`
 */
export function anticheatEvidenceObjectPath(
  submissionId: string,
  flagId: string,
): string {
  return `${submissionId}/${flagId}.jpg`
}

/** Strip `data:image/jpeg;base64,` (or any data-URL) prefix if present. */
export function stripBase64DataUrlPrefix(raw: string): string {
  const trimmed = raw.trim()
  const comma = trimmed.indexOf(',')
  if (trimmed.startsWith('data:') && comma !== -1) {
    return trimmed.slice(comma + 1)
  }
  return trimmed
}

export function decodeJpegBase64(jpegBase64: string):
  | { ok: true; bytes: Buffer }
  | { ok: false; error: string } {
  if (typeof jpegBase64 !== 'string' || !jpegBase64.trim()) {
    return { ok: false, error: 'Thiếu jpegBase64' }
  }

  let bytes: Buffer
  try {
    bytes = Buffer.from(stripBase64DataUrlPrefix(jpegBase64), 'base64')
  } catch {
    return { ok: false, error: 'jpegBase64 không hợp lệ' }
  }

  if (bytes.length === 0) {
    return { ok: false, error: 'jpegBase64 rỗng' }
  }
  if (bytes.length > MAX_EVIDENCE_JPEG_BYTES) {
    return {
      ok: false,
      error: `JPEG vượt giới hạn ${MAX_EVIDENCE_JPEG_BYTES} bytes`,
    }
  }

  // Soft magic-byte check (SOI); clients may still send slightly variant JPEG.
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { ok: false, error: 'Payload không phải JPEG' }
  }

  return { ok: true, bytes }
}

export async function uploadAnticheatEvidenceObject(input: {
  submissionId: string
  flagId: string
  bytes: Buffer
}): Promise<{ framePath: string }> {
  const supabase = createAdminClient()
  const framePath = anticheatEvidenceObjectPath(
    input.submissionId,
    input.flagId,
  )

  const { error } = await supabase.storage
    .from(ANTICHEAT_EVIDENCE_BUCKET)
    .upload(framePath, input.bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) {
    throw new Error(`anticheat evidence upload failed: ${error.message}`)
  }

  return { framePath }
}

export async function removeAnticheatEvidenceObjects(
  framePaths: string[],
): Promise<{ removed: string[]; failed: string[] }> {
  if (framePaths.length === 0) {
    return { removed: [], failed: [] }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(ANTICHEAT_EVIDENCE_BUCKET)
    .remove(framePaths)

  if (error) {
    throw new Error(`anticheat evidence remove failed: ${error.message}`)
  }

  // storage.remove is batch-scoped: no error ⇒ treat the batch as removed.
  return { removed: [...framePaths], failed: [] }
}
