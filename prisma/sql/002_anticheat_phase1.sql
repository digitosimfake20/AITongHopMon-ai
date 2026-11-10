-- Phase 1 anticheat schema (core)
-- Prefer: pnpm exec prisma db push
-- Or apply this SQL manually against Postgres if prisma generate/push is unavailable.
-- Does not auto-change grades; review fields are advisory only.

CREATE TYPE core."AnticheatConsentOutcome" AS ENUM ('granted', 'refused');
CREATE TYPE core."AnticheatTrigger" AS ENUM ('frozen', 'tab_switch', 'histogram_delta', 'hint');
CREATE TYPE core."AnticheatReviewDecision" AS ENUM ('confirmed', 'dismissed', 'pending');
CREATE TYPE core."AnticheatUnproctoredReason" AS ENUM (
  'refused_monitoring',
  'accommodation',
  'technical_issue',
  'paper_fallback'
);

ALTER TABLE core.class_tests
  ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE core.submissions
  ADD COLUMN IF NOT EXISTS unproctored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unproctored_reason core."AnticheatUnproctoredReason",
  ADD COLUMN IF NOT EXISTS unproctored_by UUID;

CREATE TABLE IF NOT EXISTS core.anticheat_consents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID NOT NULL UNIQUE REFERENCES core.submissions(id) ON DELETE CASCADE,
  outcome        core."AnticheatConsentOutcome" NOT NULL,
  notice_version TEXT,
  notice_hash    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.anticheat_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES core.submissions(id) ON DELETE CASCADE,
  trigger         core."AnticheatTrigger" NOT NULL,
  client_at       TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_decision core."AnticheatReviewDecision" NOT NULL DEFAULT 'pending',
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT
);
CREATE INDEX IF NOT EXISTS idx_anticheat_flags_submission_id
  ON core.anticheat_flags(submission_id);

CREATE TABLE IF NOT EXISTS core.anticheat_evidence (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id     UUID NOT NULL UNIQUE REFERENCES core.anticheat_flags(id) ON DELETE CASCADE,
  hash_window JSONB,
  frame_path  TEXT,
  trigger     core."AnticheatTrigger" NOT NULL,
  client_at   TIMESTAMPTZ NOT NULL
);
