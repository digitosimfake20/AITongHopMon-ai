# 8A2 Learning Platform — Database

Two PostgreSQL schemas on Supabase:

| Schema | Domain | Tables |
|---|---|---|
| **core** | Web Core | 7 tables |
| **ai** | AI Engine | 8 tables |

**Total: 15 tables** — matches the data model spec.

---

## core (Web Core)

### users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Align with Supabase Auth `auth.users.id` |
| email | TEXT UNIQUE | |
| full_name | TEXT | |
| role | ENUM | `student`, `teacher`, `admin` |
| created_at | TIMESTAMPTZ | |

### classes
| Column | Type | FK |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| code | TEXT UNIQUE | e.g. `8A2-MATH` |
| teacher_id | UUID | → users.id |
| created_at | TIMESTAMPTZ | |

### class_members
| Column | Type | FK |
|---|---|---|
| id | UUID PK | |
| class_id | UUID | → classes.id |
| student_id | UUID | → users.id |
| joined_at | TIMESTAMPTZ | |

### questions
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| subject, topic, difficulty | TEXT | |
| content | TEXT | |
| options | JSONB | |
| correct_option | TEXT | |
| explanation | TEXT | Lời giải mặc định |
| created_at | TIMESTAMPTZ | |

### tests
| Column | Type | FK |
|---|---|---|
| id | UUID PK | |
| title | TEXT | |
| class_id | UUID | → classes.id |
| question_ids | JSONB | Array of question UUIDs |
| time_limit_minutes | INT | |
| created_by | UUID | → users.id |
| created_at | TIMESTAMPTZ | |

### submissions
| Column | Type | FK |
|---|---|---|
| id | UUID PK | |
| test_id | UUID | → tests.id |
| student_id | UUID | → users.id |
| attempt_number | INT | |
| score | NUMERIC | |
| total_questions, correct_count | INT | |
| time_spent_seconds | INT | |
| ai_feedback_summary | TEXT | AI tổng quan |
| teacher_feedback | TEXT | Lời phê GV |
| is_teacher_feedback_read | BOOLEAN | `false` → popup HS |
| submitted_at | TIMESTAMPTZ | |

### submission_details
| Column | Type | FK |
|---|---|---|
| id | UUID PK | |
| submission_id | UUID | → submissions.id |
| question_id | UUID | → questions.id |
| selected_option | TEXT | |
| is_correct | BOOLEAN | |
| time_spent_seconds | INT | AI tốc độ từng câu |
| ai_personalized_hint | TEXT | Gợi ý AI cho lỗi sai |
| created_at | TIMESTAMPTZ | |

---

## ai (AI Engine)

### knowledge_nodes
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | e.g. `math-8-algebra-linear-eq` |
| subject, title | TEXT | |
| parent_node_id | TEXT | Self-ref tree |
| difficulty_level | INT | |

### student_knowledge_states
| Column | Type | FK |
|---|---|---|
| id | UUID PK | |
| student_id | UUID | → core.users.id |
| node_id | TEXT | → knowledge_nodes.id |
| p_mastery | NUMERIC | BKT probability |
| last_practiced_at | TIMESTAMPTZ | |

### student_cognitive_profiles
| Column | Type | FK |
|---|---|---|
| student_id | UUID PK | → core.users.id (1:1) |
| persona_type | TEXT | |
| avg_speed_per_question | NUMERIC | |
| careless_error_rate | NUMERIC | |
| strengths_summary | TEXT[] | |
| weaknesses_summary | TEXT[] | |
| updated_at | TIMESTAMPTZ | |

### chat_sessions
| Column | Type | FK |
|---|---|---|
| id | UUID PK | |
| student_id | UUID | → core.users.id |
| subject, title | TEXT | |
| message_count | INT | |
| created_at | TIMESTAMPTZ | |

### chat_messages
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| session_id | UUID | → chat_sessions.id |
| sender | TEXT | student / assistant / system |
| encrypted_content | TEXT | AES-256-GCM ciphertext |
| iv, auth_tag | TEXT | |
| sequence_number | INT | Trigger 15/100 summarization |
| created_at | TIMESTAMPTZ | |

### chat_chunk_summaries
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| session_id | UUID | → chat_sessions.id |
| start_seq, end_seq | INT | |
| summary_json | JSONB | Level-1 chunk (every 15 msgs) |
| created_at | TIMESTAMPTZ | |

### global_agent_memories
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| student_id | UUID UNIQUE | → core.users.id |
| long_term_summary | TEXT | Zeno executive memory |
| key_insights | JSONB | |
| total_processed_messages | INT | |
| updated_at | TIMESTAMPTZ | Level-2 (every 100 msgs) |

---

## Relationships

```
core.users ←── classes.teacher_id
core.classes ←── class_members.class_id
core.users ←── class_members.student_id
core.classes ←── tests.class_id
core.users ←── tests.created_by
core.tests ←── submissions.test_id
core.users ←── submissions.student_id
core.submissions ←── submission_details.submission_id
core.questions ←── submission_details.question_id

core.users ←── ai.student_knowledge_states.student_id
ai.knowledge_nodes ←── ai.student_knowledge_states.node_id
core.users ←── ai.student_cognitive_profiles (1:1)
core.users ←── ai.chat_sessions.student_id
ai.chat_sessions ←── ai.chat_messages.session_id
ai.chat_sessions ←── ai.chat_chunk_summaries.session_id
core.users ←── ai.global_agent_memories.student_id
```

---

## Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Source of truth (Prisma ORM) |
| `prisma/sql/001_init.sql` | Raw SQL reference for Supabase |
| `lib/prisma.ts` | Prisma client singleton |

## Commands

```bash
pnpm db:generate   # Regenerate client
pnpm db:push       # Sync schema → Supabase
pnpm db:migrate    # Create migration (production)
pnpm db:studio     # Visual browser
```

## Prisma model names vs tables

| Prisma model | DB table |
|---|---|
| `User` | `core.users` |
| `Classroom` | `core.classes` |
| `ClassMember` | `core.class_members` |
| `Question` | `core.questions` |
| `Test` | `core.tests` |
| `Submission` | `core.submissions` |
| `SubmissionDetail` | `core.submission_details` |
| `KnowledgeNode` | `ai.knowledge_nodes` |
| `StudentKnowledgeState` | `ai.student_knowledge_states` |
| `StudentCognitiveProfile` | `ai.student_cognitive_profiles` |
| `ChatSession` | `ai.chat_sessions` |
| `ChatMessage` | `ai.chat_messages` |
| `ChatChunkSummary` | `ai.chat_chunk_summaries` |
| `GlobalAgentMemory` | `ai.global_agent_memories` |
