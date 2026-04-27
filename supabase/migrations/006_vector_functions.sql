-- Create the vector similarity function for pgvector
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  kb_id UUID,
  org_id UUID,
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE 
    kc.knowledge_base_id = kb_id
    AND kc.org_id = org_id
    AND 1 - (kc.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
