-- Phase 2 anticheat evidence retention (30 days)
-- Prefer the admin-callable server action:
--   cleanupAnticheatEvidenceAction() in app/actions/anticheat.ts
-- This SQL is a documented fallback / ops checklist — it does NOT delete Storage objects.

-- ---------------------------------------------------------------------------
-- Bucket setup (Supabase Dashboard → Storage, or Management API)
-- ---------------------------------------------------------------------------
-- Bucket name: anticheat-evidence  (override with ANTICHEAT_EVIDENCE_BUCKET)
-- Public: NO (private). Client never uploads; only SUPABASE_SERVICE_ROLE_KEY.
-- Suggested RLS: deny all for anon/authenticated; service role bypasses RLS.
-- Object path scheme: {submissionId}/{flagId}.jpg  (UUIDs only; no PII names)
-- Max JPEG size enforced in app: 768 KiB decoded.

-- Example (SQL editor — Storage buckets table; adjust if your project uses Studio UI):
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values (
--   'anticheat-evidence',
--   'anticheat-evidence',
--   false,
--   786432,
--   array['image/jpeg']
-- )
-- on conflict (id) do nothing;

-- Deny public/authenticated object access (service role still works):
-- create policy "anticheat_evidence_no_client_select"
--   on storage.objects for select to authenticated, anon
--   using (bucket_id <> 'anticheat-evidence');
-- create policy "anticheat_evidence_no_client_insert"
--   on storage.objects for insert to authenticated, anon
--   with check (bucket_id <> 'anticheat-evidence');
-- create policy "anticheat_evidence_no_client_update"
--   on storage.objects for update to authenticated, anon
--   using (bucket_id <> 'anticheat-evidence');
-- create policy "anticheat_evidence_no_client_delete"
--   on storage.objects for delete to authenticated, anon
--   using (bucket_id <> 'anticheat-evidence');
-- (Or omit policies entirely so only service_role can access via API.)

-- ---------------------------------------------------------------------------
-- DB-only purge of stale Evidence rows (Storage cleanup still required)
-- ---------------------------------------------------------------------------
-- Preview candidates older than 30 days by Evidence.client_at:
-- SELECT id, flag_id, frame_path, client_at
-- FROM core.anticheat_evidence
-- WHERE client_at < NOW() - INTERVAL '30 days'
-- ORDER BY client_at ASC
-- LIMIT 200;

-- Delete DB rows only (after removing matching Storage objects via service role):
-- DELETE FROM core.anticheat_evidence
-- WHERE id IN (
--   SELECT id FROM core.anticheat_evidence
--   WHERE client_at < NOW() - INTERVAL '30 days'
--   ORDER BY client_at ASC
--   LIMIT 200
-- );

-- Flags without evidence remain; review/score fields are never auto-changed.
