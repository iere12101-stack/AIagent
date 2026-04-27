-- Message deduplication and anti-spam tables
-- Migration: 011_message_deduplication

-- Table to prevent processing duplicate messages
CREATE TABLE IF NOT EXISTS message_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, org_id)
);

-- Table to track sent replies to prevent duplicate responses
CREATE TABLE IF NOT EXISTS message_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reply_type TEXT NOT NULL CHECK (reply_type IN ('ai', 'flow', 'properties', 'handoff', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, org_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_locks_message_id_org_id ON message_locks(message_id, org_id);
CREATE INDEX IF NOT EXISTS idx_message_replies_message_id_org_id ON message_replies(message_id, org_id);

-- Clean up old locks after 30 seconds (handled by application logic)
-- Clean up old replies after 60 seconds (handled by application logic)

-- Enable RLS
ALTER TABLE message_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view message locks for their org" ON message_locks;
CREATE POLICY "Users can view message locks for their org" ON message_locks
    FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can insert message locks for their org" ON message_locks;
CREATE POLICY "Users can insert message locks for their org" ON message_locks
    FOR INSERT WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can view message replies for their org" ON message_replies;
CREATE POLICY "Users can view message replies for their org" ON message_replies
    FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can insert message replies for their org" ON message_replies;
CREATE POLICY "Users can insert message replies for their org" ON message_replies
    FOR INSERT WITH CHECK (org_id = public.current_org_id());
