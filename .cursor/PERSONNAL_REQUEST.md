# ROLE AND MISSION
You are an expert Senior Fullstack AI Engineer. 
Your task is to implement the architecture and backend logic for an Adaptive Learning Platform with an AI Agent Tutor.
Do not hardcode specific DB scripts; design clean database schemas and migrations based on the decoupled domain requirements below.

---

## 🏛️ ARCHITECTURE PRINCIPLE: DECOUPLED DOMAINS
The system must be strictly split into two decoupled domains:
1. **Web Core**: Handles User Auth, Classes, System Question Bank, Quiz Engine, and Rule-based Scoring.
2. **AI Engine**: Handles Machine Learning state tracking (BKT/Cognitive Persona), Encrypted Chat, and Recursive AI Agent Memory.

---

## 🔐 SECURITY & ENCRYPTION REQUIREMENTS (STRICT)
All chat messages stored in the database MUST be encrypted at rest (Payload Encryption).
- **Algorithm**: `AES-256-GCM`.
- **Secret Key**: `process.env.CHAT_ENCRYPTION_KEY` (32 bytes).
- **Storage Rules**: Never store raw plaintext in the messages table. Store `encrypted_content`, `iv` (Initialization Vector), `auth_tag`, and `sequence_number`.
- Provide utility functions in `lib/crypto.ts` for `encrypt()` and `decrypt()` using Node.js native `crypto`.

---

## 🔄 RECURSIVE SUMMARIZATION ENGINE LOGIC
Implement a background/inline queue trigger every time a message is saved to a chat session:

1. **Message Counter**: Increment the session's message sequence/counter.
2. **Level 1 Chunk Summary (Trigger: Every 15 messages / `sequence_number % 15 == 0`)**:
   - Query the last 15 messages of the current session.
   - Decrypt messages using `lib/crypto.ts`.
   - Call Gemini 1.5 Flash API with Structured JSON Output schema:
     `{ topics_discussed: string[], detected_weaknesses: string[], student_emotional_state: string, key_takeaways: string }`
   - Store the resulting JSON chunk summary in the database.
3. **Level 2 Global Summary (Trigger: Every 100 messages / `sequence_number % 100 == 0`)**:
   - Fetch all chunk summaries for the current session + the student's existing long-term memory.
   - Call Gemini 1.5 Flash API to synthesize an executive, long-term Zeno-style student memory narrative.
   - Upsert this global memory record for the student.

---

## 🎯 AI CONTEXT INJECTION (SYSTEM PROMPT)
When initializing an AI Chat session, DO NOT send raw chat history. 
Inject context into the System Prompt using:
- Student's Cognitive Persona & Topic Mastery Status.
- Executive Long-term Global Memory (Zeno Summary).
- The most recent 1-2 Chunk Summaries (JSON).

---

## 🛠️ CODE GENERATION STANDARDS
- Write clean, modular TypeScript with strict type definitions.
- Implement database access using Server Actions or Next.js App Router API routes (`app/api/`).
- Design the Database Schema automatically to fulfill all the above features cleanly.