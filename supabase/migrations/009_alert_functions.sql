CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('lead', 'handoff', 'sentiment', 'booking', 'nudge', 'system', 'analytics')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  template_id VARCHAR(100),
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  whatsapp JSONB NOT NULL DEFAULT '{"enabled": true}'::jsonb,
  email JSONB NOT NULL DEFAULT '{"enabled": true, "immediate": true}'::jsonb,
  sms JSONB NOT NULL DEFAULT '{"enabled": false, "urgent_only": true}'::jsonb,
  push JSONB NOT NULL DEFAULT '{"enabled": true}'::jsonb,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiet_hours JSONB NOT NULL DEFAULT '{"enabled": true, "startTime": "22:00", "endTime": "08:00"}'::jsonb,
  sound_settings JSONB NOT NULL DEFAULT '{"enabled": true, "volume": 50, "sound": "default"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('lead', 'handoff', 'sentiment', 'booking', 'nudge', 'system', 'analytics')),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  template JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours JSONB NOT NULL DEFAULT '{"enabled": true, "startTime": "22:00", "endTime": "08:00"}'::jsonb;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sound_settings JSONB NOT NULL DEFAULT '{"enabled": true, "volume": 50, "sound": "default"}'::jsonb;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE alert_templates ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE alert_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_templates_org_name ON alert_templates(org_id, name);

CREATE INDEX IF NOT EXISTS idx_alerts_org_id ON alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_contact_id ON alerts(contact_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_alert_id ON notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

CREATE INDEX IF NOT EXISTS idx_notification_rules_org_id ON notification_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON notification_rules(type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_enabled ON notification_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_notification_rules_priority ON notification_rules(priority);

CREATE INDEX IF NOT EXISTS idx_alert_templates_org_id ON alert_templates(org_id);

DROP FUNCTION IF EXISTS public.get_alert_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION get_alert_stats(
  p_org_id UUID,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_alerts BIGINT,
  alerts_by_type JSONB,
  alerts_by_priority JSONB,
  delivery_rate NUMERIC,
  average_response_time NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH scoped_alerts AS (
    SELECT *
    FROM alerts
    WHERE org_id = p_org_id
      AND created_at BETWEEN start_date AND end_date
  ),
  totals AS (
    SELECT COUNT(*) AS total
    FROM scoped_alerts
  ),
  type_counts AS (
    SELECT COALESCE(jsonb_object_agg(type, count_value), '{}'::jsonb) AS value
    FROM (
      SELECT type, COUNT(*) AS count_value
      FROM scoped_alerts
      GROUP BY type
    ) grouped
  ),
  priority_counts AS (
    SELECT COALESCE(jsonb_object_agg(priority, count_value), '{}'::jsonb) AS value
    FROM (
      SELECT priority, COUNT(*) AS count_value
      FROM scoped_alerts
      GROUP BY priority
    ) grouped
  ),
  deliveries AS (
    SELECT COUNT(DISTINCT scoped_alerts.id) FILTER (
      WHERE notifications.status IN ('sent', 'delivered')
        OR notifications.delivered_at IS NOT NULL
    ) AS delivered_count
    FROM scoped_alerts
    LEFT JOIN notifications ON notifications.alert_id = scoped_alerts.id
  ),
  response_times AS (
    SELECT AVG(
      EXTRACT(EPOCH FROM (COALESCE(notifications.delivered_at, notifications.sent_at) - scoped_alerts.created_at)) / 60.0
    ) AS avg_minutes
    FROM scoped_alerts
    JOIN notifications ON notifications.alert_id = scoped_alerts.id
    WHERE COALESCE(notifications.delivered_at, notifications.sent_at) IS NOT NULL
  )
  SELECT
    totals.total AS total_alerts,
    type_counts.value AS alerts_by_type,
    priority_counts.value AS alerts_by_priority,
    CASE
      WHEN totals.total > 0
        THEN ROUND((COALESCE(deliveries.delivered_count, 0)::NUMERIC / totals.total::NUMERIC) * 100, 2)
      ELSE 0
    END AS delivery_rate,
    COALESCE(ROUND(COALESCE(response_times.avg_minutes, 0)::NUMERIC, 2), 0) AS average_response_time
  FROM totals
  CROSS JOIN type_counts
  CROSS JOIN priority_counts
  CROSS JOIN deliveries
  CROSS JOIN response_times;
END;
$$;

DROP FUNCTION IF EXISTS public.track_notification_delivery(UUID, VARCHAR, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION track_notification_delivery(
  p_notification_id UUID,
  p_status VARCHAR,
  p_delivered_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notifications
  SET status = p_status,
      delivered_at = CASE
        WHEN p_status = 'delivered' THEN COALESCE(p_delivered_at, NOW())
        ELSE delivered_at
      END,
      updated_at = NOW()
  WHERE id = p_notification_id;

  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_notification_preferences(UUID);
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  whatsapp JSONB,
  email JSONB,
  sms JSONB,
  push JSONB,
  categories JSONB,
  quiet_hours JSONB,
  sound_settings JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notification_preferences.whatsapp,
    notification_preferences.email,
    notification_preferences.sms,
    notification_preferences.push,
    notification_preferences.categories,
    notification_preferences.quiet_hours,
    notification_preferences.sound_settings
  FROM notification_preferences
  WHERE notification_preferences.user_id = p_user_id;
END;
$$;

DROP FUNCTION IF EXISTS public.evaluate_notification_rules(UUID, VARCHAR, JSONB);
CREATE OR REPLACE FUNCTION evaluate_notification_rules(
  p_org_id UUID,
  event_type VARCHAR,
  event_data JSONB
)
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  conditions_met BOOLEAN,
  actions JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notification_rules.id AS rule_id,
    notification_rules.name AS rule_name,
    TRUE AS conditions_met,
    notification_rules.actions
  FROM notification_rules
  WHERE notification_rules.org_id = p_org_id
    AND notification_rules.enabled = TRUE
    AND notification_rules.type = event_type
  ORDER BY notification_rules.priority ASC;
END;
$$;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alerts_select_org ON alerts;
CREATE POLICY alerts_select_org ON alerts
  FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS alerts_insert_org ON alerts;
CREATE POLICY alerts_insert_org ON alerts
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR org_id = public.current_org_id());

DROP POLICY IF EXISTS alerts_update_org ON alerts;
CREATE POLICY alerts_update_org ON alerts
  FOR UPDATE USING (auth.role() = 'service_role' OR org_id = public.current_org_id())
  WITH CHECK (auth.role() = 'service_role' OR org_id = public.current_org_id());

DROP POLICY IF EXISTS notification_preferences_select_self ON notification_preferences;
CREATE POLICY notification_preferences_select_self ON notification_preferences
  FOR SELECT USING (
    org_id = public.current_org_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS notification_preferences_insert_self ON notification_preferences;
CREATE POLICY notification_preferences_insert_self ON notification_preferences
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR (org_id = public.current_org_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS notification_preferences_update_self ON notification_preferences;
CREATE POLICY notification_preferences_update_self ON notification_preferences
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR (org_id = public.current_org_id() AND user_id = auth.uid())
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (org_id = public.current_org_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS notifications_select_self ON notifications;
CREATE POLICY notifications_select_self ON notifications
  FOR SELECT USING (
    org_id = public.current_org_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS notifications_insert_org ON notifications;
CREATE POLICY notifications_insert_org ON notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR (org_id = public.current_org_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS notifications_update_self ON notifications;
CREATE POLICY notifications_update_self ON notifications
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR (org_id = public.current_org_id() AND user_id = auth.uid())
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (org_id = public.current_org_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS notification_rules_select_org ON notification_rules;
CREATE POLICY notification_rules_select_org ON notification_rules
  FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS notification_rules_manage_admin ON notification_rules;
CREATE POLICY notification_rules_manage_admin ON notification_rules
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.org_id = notification_rules.org_id
        AND users.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.org_id = notification_rules.org_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS alert_templates_select_org ON alert_templates;
CREATE POLICY alert_templates_select_org ON alert_templates
  FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS alert_templates_manage_admin ON alert_templates;
CREATE POLICY alert_templates_manage_admin ON alert_templates
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.org_id = alert_templates.org_id
        AND users.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.org_id = alert_templates.org_id
        AND users.role IN ('owner', 'admin')
    )
  );

DROP TRIGGER IF EXISTS alerts_set_updated_at ON alerts;
CREATE TRIGGER alerts_set_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS notification_preferences_set_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS notification_rules_set_updated_at ON notification_rules;
CREATE TRIGGER notification_rules_set_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS alert_templates_set_updated_at ON alert_templates;
CREATE TRIGGER alert_templates_set_updated_at
  BEFORE UPDATE ON alert_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS notifications_set_updated_at ON notifications;
CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON notification_rules TO authenticated;
GRANT SELECT ON alert_templates TO authenticated;

GRANT EXECUTE ON FUNCTION get_alert_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION track_notification_delivery(UUID, VARCHAR, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_notification_rules(UUID, VARCHAR, JSONB) TO authenticated;
