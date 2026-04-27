# Supabase Migration Order

Apply the active v4 migration chain in this order:

1. `001_initial_schema.sql`
2. `002_pgvector.sql`
3. `003_properties_seed.sql`
4. `004_team_members_seed.sql`
5. `005_rls_policies.sql`
6. `006_vector_functions.sql`
7. `007_nudge_functions.sql`
8. `008_sentiment_functions.sql`
9. `009_alert_functions.sql`

Notes:

- Older superseded SQL files that would otherwise conflict with the canonical numbering now live in `legacy/`.
- Any older references to `001_core_schema.sql` or `002_rls_policies.sql` are stale. Use the numbered chain above.
