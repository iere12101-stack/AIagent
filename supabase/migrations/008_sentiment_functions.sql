CREATE TABLE IF NOT EXISTS sentiment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  sentiment_score NUMERIC(3,2) NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment VARCHAR(20) NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  emotions TEXT[] NOT NULL DEFAULT '{}'::text[],
  escalation_risk VARCHAR(20) NOT NULL CHECK (escalation_risk IN ('low', 'medium', 'high', 'critical')),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sentiment_history ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sentiment_history ADD COLUMN IF NOT EXISTS emotions TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE sentiment_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sentiment_history_org_id ON sentiment_history(org_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_history_contact_id ON sentiment_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_history_message_id ON sentiment_history(message_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_history_analyzed_at ON sentiment_history(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_history_escalation_risk ON sentiment_history(escalation_risk);

CREATE OR REPLACE FUNCTION get_handoff_stats(p_org_id UUID)
RETURNS TABLE (
  total_handoffs BIGINT,
  accepted_handoffs BIGINT,
  rejected_handoffs BIGINT,
  pending_handoffs BIGINT,
  average_response_time NUMERIC,
  handoffs_by_trigger JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH handoff_summary AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      AVG(
        CASE
          WHEN accepted_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60.0
          ELSE NULL
        END
      ) AS avg_response_minutes
    FROM handoff_events
    WHERE org_id = p_org_id
  ),
  trigger_counts AS (
    SELECT COALESCE(jsonb_object_agg(triggered_by, count_value), '{}'::jsonb) AS value
    FROM (
      SELECT triggered_by, COUNT(*) AS count_value
      FROM handoff_events
      WHERE org_id = p_org_id
      GROUP BY triggered_by
    ) grouped
  )
  SELECT
    handoff_summary.total AS total_handoffs,
    handoff_summary.accepted_count AS accepted_handoffs,
    handoff_summary.rejected_count AS rejected_handoffs,
    handoff_summary.pending_count AS pending_handoffs,
    COALESCE(ROUND(COALESCE(handoff_summary.avg_response_minutes, 0)::NUMERIC, 2), 0) AS average_response_time,
    trigger_counts.value AS handoffs_by_trigger
  FROM handoff_summary
  CROSS JOIN trigger_counts;
END;
$$;

CREATE OR REPLACE FUNCTION analyze_sentiment_trend(
  p_contact_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  average_score NUMERIC,
  trend VARCHAR(20),
  risk_level VARCHAR(20),
  emotion_frequency JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH scoped_history AS (
    SELECT *
    FROM sentiment_history
    WHERE contact_id = p_contact_id
      AND analyzed_at >= NOW() - make_interval(hours => GREATEST(p_hours, 1))
  ),
  score_summary AS (
    SELECT AVG(sentiment_score) AS avg_score
    FROM scoped_history
  ),
  risk_summary AS (
    SELECT escalation_risk
    FROM scoped_history
    GROUP BY escalation_risk
    ORDER BY
      CASE escalation_risk
        WHEN 'critical' THEN 4
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        ELSE 1
      END DESC,
      COUNT(*) DESC
    LIMIT 1
  ),
  emotion_counts AS (
    SELECT COALESCE(jsonb_object_agg(emotion, emotion_count), '{}'::jsonb) AS value
    FROM (
      SELECT emotion, COUNT(*) AS emotion_count
      FROM scoped_history
      CROSS JOIN LATERAL unnest(emotions) AS emotion
      GROUP BY emotion
    ) grouped
  )
  SELECT
    COALESCE(ROUND(COALESCE(score_summary.avg_score, 0)::NUMERIC, 2), 0) AS average_score,
    CASE
      WHEN COALESCE(score_summary.avg_score, 0) > 0.2 THEN 'positive'
      WHEN COALESCE(score_summary.avg_score, 0) < -0.2 THEN 'negative'
      ELSE 'neutral'
    END::VARCHAR(20) AS trend,
    COALESCE((SELECT escalation_risk FROM risk_summary), 'low')::VARCHAR(20) AS risk_level,
    COALESCE((SELECT value FROM emotion_counts), '{}'::jsonb) AS emotion_frequency
  FROM score_summary;
END;
$$;

CREATE OR REPLACE FUNCTION monitor_escalation_risks(
  p_org_id UUID,
  p_risk_level VARCHAR DEFAULT 'high'
)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  phone TEXT,
  current_score NUMERIC,
  risk_level VARCHAR,
  last_message TIMESTAMPTZ,
  escalation_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH latest_sentiment AS (
    SELECT DISTINCT ON (sentiment_history.contact_id)
      sentiment_history.contact_id,
      sentiment_history.sentiment_score,
      sentiment_history.escalation_risk,
      sentiment_history.analyzed_at
    FROM sentiment_history
    WHERE sentiment_history.org_id = p_org_id
      AND sentiment_history.escalation_risk = p_risk_level
    ORDER BY sentiment_history.contact_id, sentiment_history.analyzed_at DESC
  ),
  escalation_counts AS (
    SELECT
      handoff_events.contact_id,
      COUNT(*) AS escalation_count
    FROM handoff_events
    WHERE handoff_events.org_id = p_org_id
      AND handoff_events.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY handoff_events.contact_id
  )
  SELECT
    latest_sentiment.contact_id,
    COALESCE(contacts.name, 'Unknown') AS contact_name,
    contacts.phone,
    latest_sentiment.sentiment_score AS current_score,
    latest_sentiment.escalation_risk AS risk_level,
    contacts.last_message_at AS last_message,
    COALESCE(escalation_counts.escalation_count, 0) AS escalation_count
  FROM latest_sentiment
  JOIN contacts ON contacts.id = latest_sentiment.contact_id
  LEFT JOIN escalation_counts ON escalation_counts.contact_id = latest_sentiment.contact_id
  ORDER BY latest_sentiment.analyzed_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_agent_sentiment_workload(p_agent_id UUID)
RETURNS TABLE (
  active_conversations BIGINT,
  high_risk_contacts BIGINT,
  average_sentiment NUMERIC,
  escalation_rate NUMERIC,
  response_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH agent_conversations AS (
    SELECT
      COUNT(DISTINCT conversations.id) AS active_conv_count,
      AVG(sentiment_history.sentiment_score) AS avg_sentiment,
      COUNT(DISTINCT CASE
        WHEN sentiment_history.escalation_risk IN ('high', 'critical') THEN contacts.id
        ELSE NULL
      END) AS high_risk_count
    FROM conversations
    JOIN contacts ON contacts.id = conversations.contact_id
    LEFT JOIN sentiment_history
      ON sentiment_history.contact_id = contacts.id
      AND sentiment_history.analyzed_at >= NOW() - INTERVAL '24 hours'
    WHERE conversations.assigned_to = p_agent_id
      AND conversations.status = 'active'
  ),
  agent_handoffs AS (
    SELECT
      COUNT(*) AS total_handoffs,
      COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_handoffs
    FROM handoff_events
    WHERE assigned_to = p_agent_id
      AND created_at >= NOW() - INTERVAL '7 days'
  ),
  agent_responses AS (
    SELECT
      COUNT(*) AS total_messages,
      COUNT(*) FILTER (WHERE direction = 'outbound') AS outbound_messages
    FROM messages
    JOIN conversations ON conversations.id = messages.conversation_id
    WHERE conversations.assigned_to = p_agent_id
      AND messages.created_at >= NOW() - INTERVAL '7 days'
  )
  SELECT
    COALESCE(agent_conversations.active_conv_count, 0) AS active_conversations,
    COALESCE(agent_conversations.high_risk_count, 0) AS high_risk_contacts,
    COALESCE(ROUND(COALESCE(agent_conversations.avg_sentiment, 0)::NUMERIC, 2), 0) AS average_sentiment,
    CASE
      WHEN agent_handoffs.total_handoffs > 0
        THEN ROUND((agent_handoffs.accepted_handoffs::NUMERIC / agent_handoffs.total_handoffs::NUMERIC) * 100, 2)
      ELSE 0
    END AS escalation_rate,
    CASE
      WHEN agent_responses.total_messages > 0
        THEN ROUND((agent_responses.outbound_messages::NUMERIC / agent_responses.total_messages::NUMERIC) * 100, 2)
      ELSE 0
    END AS response_rate
  FROM agent_conversations
  CROSS JOIN agent_handoffs
  CROSS JOIN agent_responses;
END;
$$;

ALTER TABLE sentiment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sentiment_history_select_org ON sentiment_history;
CREATE POLICY sentiment_history_select_org ON sentiment_history
  FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS sentiment_history_insert_org ON sentiment_history;
CREATE POLICY sentiment_history_insert_org ON sentiment_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR org_id = public.current_org_id());

DROP POLICY IF EXISTS sentiment_history_update_org ON sentiment_history;
CREATE POLICY sentiment_history_update_org ON sentiment_history
  FOR UPDATE USING (auth.role() = 'service_role' OR org_id = public.current_org_id())
  WITH CHECK (auth.role() = 'service_role' OR org_id = public.current_org_id());

DROP TRIGGER IF EXISTS sentiment_history_set_updated_at ON sentiment_history;
CREATE TRIGGER sentiment_history_set_updated_at
  BEFORE UPDATE ON sentiment_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON sentiment_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_handoff_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_sentiment_trend(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_escalation_risks(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_sentiment_workload(UUID) TO authenticated;
