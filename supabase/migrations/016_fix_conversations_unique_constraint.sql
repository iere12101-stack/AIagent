-- Fix inbound AI replies not sending:
-- Ensure conversations upsert on (org_id, contact_id) is valid.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'conversations'
  ) THEN
    -- Create unique index if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'conversations_org_id_contact_id_key'
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX conversations_org_id_contact_id_key ON public.conversations (org_id, contact_id)';
    END IF;
  END IF;
END $$;

