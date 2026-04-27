-- pgvector extension and indexes
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index on knowledge_chunks.embedding
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw 
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- GIN index on properties for full-text search
CREATE INDEX IF NOT EXISTS properties_fts 
  ON properties USING gin(to_tsvector('english', coalesce(district,'') || ' ' || coalesce(building,'') || ' ' || coalesce(bedrooms,'')));

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS properties_price ON properties(price_aed);
CREATE INDEX IF NOT EXISTS properties_available ON properties(available);
CREATE INDEX IF NOT EXISTS contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS contacts_org_score ON contacts(org_id, lead_score);
CREATE INDEX IF NOT EXISTS conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS nudge_jobs_scheduled ON nudge_jobs(scheduled_at, status);
CREATE INDEX IF NOT EXISTS team_members_speciality ON team_members USING GIN(area_speciality);
