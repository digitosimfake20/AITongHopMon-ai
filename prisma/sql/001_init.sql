-- 8A2 Learning Platform — Full database init (reference SQL)
-- Generated from prisma/schema.prisma
-- Schemas: core (Web Core) | ai (AI Engine)

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ai;

-- =============================================================================
-- WEB CORE
-- =============================================================================

CREATE TYPE core."UserRole" AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE core.users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT NOT NULL,
  role       core."UserRole" NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  teacher_id UUID NOT NULL REFERENCES core.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_classes_teacher_id ON core.classes(teacher_id);

CREATE TABLE core.class_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES core.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, student_id)
);
CREATE INDEX idx_class_members_student_id ON core.class_members(student_id);

CREATE TABLE core.questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject        TEXT NOT NULL,
  topic          TEXT NOT NULL,
  difficulty     TEXT NOT NULL,
  content        TEXT NOT NULL,
  options        JSONB NOT NULL,
  correct_option TEXT NOT NULL,
  explanation    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_questions_subject_topic ON core.questions(subject, topic);

CREATE TABLE core.tests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  class_id           UUID NOT NULL REFERENCES core.classes(id) ON DELETE CASCADE,
  question_ids       JSONB NOT NULL,
  time_limit_minutes INT NOT NULL,
  created_by         UUID NOT NULL REFERENCES core.users(id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tests_class_id ON core.tests(class_id);
CREATE INDEX idx_tests_created_by ON core.tests(created_by);

CREATE TABLE core.submissions (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id                    UUID NOT NULL REFERENCES core.tests(id) ON DELETE CASCADE,
  student_id                 UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  attempt_number             INT NOT NULL,
  score                      NUMERIC(5, 2) NOT NULL,
  total_questions            INT NOT NULL,
  correct_count              INT NOT NULL,
  time_spent_seconds         INT NOT NULL,
  ai_feedback_summary        TEXT,
  teacher_feedback           TEXT,
  is_teacher_feedback_read   BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (test_id, student_id, attempt_number)
);
CREATE INDEX idx_submissions_student_id ON core.submissions(student_id);

CREATE TABLE core.submission_details (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id        UUID NOT NULL REFERENCES core.submissions(id) ON DELETE CASCADE,
  question_id          UUID NOT NULL REFERENCES core.questions(id) ON DELETE RESTRICT,
  selected_option      TEXT NOT NULL,
  is_correct           BOOLEAN NOT NULL,
  time_spent_seconds   INT NOT NULL,
  ai_personalized_hint TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_submission_details_submission_id ON core.submission_details(submission_id);
CREATE INDEX idx_submission_details_question_id ON core.submission_details(question_id);

-- =============================================================================
-- AI ENGINE
-- =============================================================================

CREATE TABLE ai.knowledge_nodes (
  id               TEXT PRIMARY KEY,
  subject          TEXT NOT NULL,
  title            TEXT NOT NULL,
  parent_node_id   TEXT REFERENCES ai.knowledge_nodes(id) ON DELETE SET NULL,
  difficulty_level INT NOT NULL
);
CREATE INDEX idx_knowledge_nodes_subject ON ai.knowledge_nodes(subject);
CREATE INDEX idx_knowledge_nodes_parent ON ai.knowledge_nodes(parent_node_id);

CREATE TABLE ai.student_knowledge_states (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  node_id           TEXT NOT NULL REFERENCES ai.knowledge_nodes(id) ON DELETE CASCADE,
  p_mastery         NUMERIC(5, 4) NOT NULL,
  last_practiced_at TIMESTAMPTZ,
  UNIQUE (student_id, node_id)
);
CREATE INDEX idx_sks_node_id ON ai.student_knowledge_states(node_id);

CREATE TABLE ai.student_cognitive_profiles (
  student_id              UUID PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  persona_type            TEXT NOT NULL,
  avg_speed_per_question  NUMERIC(8, 2) NOT NULL,
  careless_error_rate     NUMERIC(5, 4) NOT NULL,
  strengths_summary       TEXT[] NOT NULL,
  weaknesses_summary      TEXT[] NOT NULL,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai.chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  title         TEXT NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_student_id ON ai.chat_sessions(student_id);

CREATE TABLE ai.chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES ai.chat_sessions(id) ON DELETE CASCADE,
  sender            TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  iv                TEXT NOT NULL,
  auth_tag          TEXT NOT NULL,
  sequence_number   INT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, sequence_number)
);
CREATE INDEX idx_chat_messages_session_id ON ai.chat_messages(session_id);

CREATE TABLE ai.chat_chunk_summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES ai.chat_sessions(id) ON DELETE CASCADE,
  start_seq    INT NOT NULL,
  end_seq      INT NOT NULL,
  summary_json JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_chunk_summaries_session_id ON ai.chat_chunk_summaries(session_id);

CREATE TABLE ai.global_agent_memories (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               UUID NOT NULL UNIQUE REFERENCES core.users(id) ON DELETE CASCADE,
  long_term_summary        TEXT NOT NULL,
  key_insights             JSONB NOT NULL,
  total_processed_messages INT NOT NULL DEFAULT 0,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
