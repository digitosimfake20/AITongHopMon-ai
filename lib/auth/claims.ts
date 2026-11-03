/**
 * Verified identity from JWT claims (prefer over auth.getUser on the critical path).
 * With asymmetric signing keys, getClaims verifies locally via cached JWKS — no Auth hop.
 */

export type VerifiedAuthIdentity = {
  id: string
  email: string
  userMetadata: Record<string, unknown>
}

type ClaimsClient = {
  auth: {
    getClaims: () => Promise<{
      data: { claims?: Record<string, unknown> | null } | null
      error: { code?: string; message?: string } | null
    }>
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function getVerifiedAuthIdentity(
  supabase: ClaimsClient,
): Promise<{
  identity: VerifiedAuthIdentity | null
  error: { code?: string; message?: string } | null
}> {
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  const id = typeof claims?.sub === 'string' ? claims.sub : null
  const email = typeof claims?.email === 'string' ? claims.email : null

  if (!claims || !id || !email) {
    return { identity: null, error }
  }

  return {
    identity: {
      id,
      email,
      userMetadata: asRecord(claims.user_metadata),
    },
    error,
  }
}
