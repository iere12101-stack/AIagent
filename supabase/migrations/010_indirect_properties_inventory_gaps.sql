ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct'
  CHECK (source IN ('direct', 'indirect'));

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS partner_agency TEXT,
  ADD COLUMN IF NOT EXISTS partner_agent_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_agent_phone TEXT,
  ADD COLUMN IF NOT EXISTS partner_agent_email TEXT,
  ADD COLUMN IF NOT EXISTS listing_url TEXT,
  ADD COLUMN IF NOT EXISTS co_broker_commission TEXT;

DROP INDEX IF EXISTS idx_properties_fts;
CREATE INDEX idx_properties_fts ON properties
  USING gin(to_tsvector('english',
    coalesce(district,'') || ' ' ||
    coalesce(building,'') || ' ' ||
    coalesce(category,'') || ' ' ||
    coalesce(bedrooms,'') || ' ' ||
    coalesce(partner_agency,'') || ' ' ||
    coalesce(source,'')
  ));

CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(org_id, source);

CREATE TABLE IF NOT EXISTS inventory_gaps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id        uuid REFERENCES contacts(id),
  conversation_id   uuid REFERENCES conversations(id),
  transaction_type  TEXT,
  area              TEXT,
  bedrooms          TEXT,
  budget_min        NUMERIC,
  budget_max        NUMERIC,
  status_wanted     TEXT,
  category          TEXT,
  direct_results    INT DEFAULT 0,
  indirect_results  INT DEFAULT 0,
  used_fallback     BOOLEAN DEFAULT FALSE,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE inventory_gaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON inventory_gaps;
CREATE POLICY org_isolation ON inventory_gaps
  USING (org_id = (current_setting('request.jwt.claims', true)::jsonb->>'org_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_gaps_area ON inventory_gaps(org_id, area);
CREATE INDEX IF NOT EXISTS idx_gaps_created ON inventory_gaps(org_id, created_at DESC);
