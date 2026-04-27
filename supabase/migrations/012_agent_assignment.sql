-- Agent assignment and lead management tables
-- Migration: 012_agent_assignment

-- Table to track agent assignments to leads
CREATE TABLE IF NOT EXISTS lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    assigned_area TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add assigned agent fields to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assignment_area TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_assignments_org_id ON lead_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_contact_id ON lead_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_agent_id ON lead_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_assigned_at ON lead_assignments(assigned_at);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_agent_id ON contacts(assigned_agent_id);

-- Enable RLS
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view lead assignments for their org" ON lead_assignments;
CREATE POLICY "Users can view lead assignments for their org" ON lead_assignments
    FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can insert lead assignments for their org" ON lead_assignments;
CREATE POLICY "Users can insert lead assignments for their org" ON lead_assignments
    FOR INSERT WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Users can update lead assignments for their org" ON lead_assignments;
CREATE POLICY "Users can update lead assignments for their org" ON lead_assignments
    FOR UPDATE USING (org_id = public.current_org_id());

-- Update trigger for lead_assignments
CREATE TRIGGER update_lead_assignments_updated_at
    BEFORE UPDATE ON lead_assignments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
