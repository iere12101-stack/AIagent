-- IERE runtime routing/data cleanup pass
-- Run in Supabase SQL Editor before deployment verification.

-- This migration is schema-safe: every update checks table/column existence.
DO $$
DECLARE
  has_team_members boolean;
  has_tm_active boolean;
  has_tm_name boolean;
  has_tm_whatsapp boolean;
  has_tm_updated_at boolean;
  has_properties boolean;
  has_prop_district boolean;
  has_conversation_flows boolean;
  has_cf_active boolean;
  has_cf_updated_at boolean;
  has_cf_name boolean;
  has_cf_config boolean;
  has_flow_steps boolean;
  has_fs_active boolean;
  has_fs_updated_at boolean;
  has_fs_config boolean;
  has_fs_step_type boolean;
BEGIN
  -- Table/column presence checks
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') INTO has_team_members;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'active') INTO has_tm_active;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'name') INTO has_tm_name;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'whatsapp') INTO has_tm_whatsapp;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'updated_at') INTO has_tm_updated_at;

  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') INTO has_properties;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'district') INTO has_prop_district;

  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_flows') INTO has_conversation_flows;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversation_flows' AND column_name = 'active') INTO has_cf_active;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversation_flows' AND column_name = 'updated_at') INTO has_cf_updated_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversation_flows' AND column_name = 'name') INTO has_cf_name;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversation_flows' AND column_name = 'config') INTO has_cf_config;

  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flow_steps') INTO has_flow_steps;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'flow_steps' AND column_name = 'active') INTO has_fs_active;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'flow_steps' AND column_name = 'updated_at') INTO has_fs_updated_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'flow_steps' AND column_name = 'config') INTO has_fs_config;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'flow_steps' AND column_name = 'step_type') INTO has_fs_step_type;

  -- 1) Deactivate internal staff from routing
  IF has_team_members AND has_tm_active AND has_tm_name THEN
    EXECUTE $sql$
      UPDATE team_members
      SET active = false
      WHERE name ILIKE '%ayaz%'
         OR name ILIKE '%hrithik%'
         OR name ILIKE '%sarah shaheen%'
    $sql$;
  END IF;

  -- 2) Disable patience/handoff auto-messages
  IF has_conversation_flows AND has_cf_active THEN
    IF has_cf_config AND has_cf_name THEN
      IF has_cf_updated_at THEN
        EXECUTE $sql$
          UPDATE conversation_flows
          SET active = false, updated_at = NOW()
          WHERE config::text ILIKE '%patience%'
             OR config::text ILIKE '%follow up with you shortly%'
             OR name ILIKE '%handoff%'
        $sql$;
      ELSE
        EXECUTE $sql$
          UPDATE conversation_flows
          SET active = false
          WHERE config::text ILIKE '%patience%'
             OR config::text ILIKE '%follow up with you shortly%'
             OR name ILIKE '%handoff%'
        $sql$;
      END IF;
    ELSIF has_cf_name THEN
      IF has_cf_updated_at THEN
        EXECUTE $sql$
          UPDATE conversation_flows
          SET active = false, updated_at = NOW()
          WHERE name ILIKE '%handoff%'
        $sql$;
      ELSE
        EXECUTE $sql$
          UPDATE conversation_flows
          SET active = false
          WHERE name ILIKE '%handoff%'
        $sql$;
      END IF;
    END IF;
  END IF;

  IF has_flow_steps AND has_fs_active THEN
    IF has_fs_config AND has_fs_step_type THEN
      IF has_fs_updated_at THEN
        EXECUTE $sql$
          UPDATE flow_steps
          SET active = false, updated_at = NOW()
          WHERE config::text ILIKE '%patience%'
             OR config::text ILIKE '%follow up shortly%'
             OR step_type ILIKE '%agent_assign%'
        $sql$;
      ELSE
        EXECUTE $sql$
          UPDATE flow_steps
          SET active = false
          WHERE config::text ILIKE '%patience%'
             OR config::text ILIKE '%follow up shortly%'
             OR step_type ILIKE '%agent_assign%'
        $sql$;
      END IF;
    ELSIF has_fs_step_type THEN
      IF has_fs_updated_at THEN
        EXECUTE $sql$
          UPDATE flow_steps
          SET active = false, updated_at = NOW()
          WHERE step_type ILIKE '%agent_assign%'
        $sql$;
      ELSE
        EXECUTE $sql$
          UPDATE flow_steps
          SET active = false
          WHERE step_type ILIKE '%agent_assign%'
        $sql$;
      END IF;
    END IF;
  END IF;

  -- 3) Clean corrupted phone placeholders in team_members
  IF has_team_members AND has_tm_whatsapp THEN
    EXECUTE $sql$
      UPDATE team_members
      SET whatsapp = NULL
      WHERE whatsapp ~ '(team-verified|placeholder|\[|\{|[xX]{3,})'
    $sql$;
  END IF;

  -- 4) Normalize Burj Khalifa district naming where needed
  IF has_properties AND has_prop_district THEN
    EXECUTE $sql$
      UPDATE properties
      SET district = 'Downtown Dubai'
      WHERE district ILIKE '%burj khalifa%'
        AND district NOT ILIKE '%downtown%'
    $sql$;
  END IF;
END $$;
