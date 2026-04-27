-- Hybrid RAG: semantic vector search
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  kb_id           uuid,
  org_id          uuid,
  match_count     int default 5,
  similarity_threshold float default 0.65
)
returns table (
  id        uuid,
  content   text,
  metadata  jsonb,
  similarity float
)
language sql stable
as $$
  select
    kc.id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where
    kc.knowledge_base_id = kb_id
    and kc.org_id = org_id
    and 1 - (kc.embedding <=> query_embedding) > similarity_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;
