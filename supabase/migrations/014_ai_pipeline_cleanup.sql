-- Complete AI pipeline cleanup:
-- 1. Remove bad/test property data that causes fake-looking replies.
-- 2. Deactivate internal/non-client-facing staff in team_members.
-- 3. Null placeholder phone fields where those legacy columns exist.
-- 4. Disable DB-backed flows that auto-send handoff/patience templates.
--
-- Safe for Supabase SQL Editor:
-- all optional tables/columns are checked before use.

-- ============================================================================
-- STEP 1A: Delete clearly wrong/test property records
-- ============================================================================

DELETE FROM properties
WHERE size_sqft > 50000;

DELETE FROM properties
WHERE transaction_type = 'SALE'
  AND price_aed < 10000;

DELETE FROM properties
WHERE ref_number IN ('FDS', 'IERE-52', '5551');

DELETE FROM properties
WHERE size_sqft IS NOT NULL
  AND size_sqft < 100;

-- ============================================================================
-- STEP 1B: Clean placeholder property/team data
-- ============================================================================

UPDATE properties
SET ref_number = NULL
WHERE ref_number ILIKE '%team-verified%';

UPDATE properties
SET building = NULL
WHERE building ILIKE '%team-verified%';

UPDATE properties
SET description = NULL
WHERE description ILIKE '%team-verified%';

UPDATE properties
SET agent_name = 'IERE Team'
WHERE agent_name ILIKE '%team-verified%'
   OR agent_name ILIKE '%ayaz%';

UPDATE team_members
SET active = false
WHERE name ILIKE '%ayaz%'
   OR name ILIKE '%hrithik%'
   OR name ILIKE '%sarah shaheen%';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_members'
      AND column_name = 'whatsapp'
  ) THEN
    EXECUTE $sql$
      UPDATE team_members
      SET whatsapp = NULL
      WHERE whatsapp ILIKE '%team-verified%'
         OR whatsapp ILIKE '%XXXXXXXXXX%'
         OR whatsapp ~ '[xX]{3,}'
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_members'
      AND column_name = 'phone_number'
  ) THEN
    EXECUTE $sql$
      UPDATE team_members
      SET phone_number = NULL
      WHERE phone_number ILIKE '%team-verified%'
         OR phone_number ~ '[xX]{3,}'
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_members'
      AND column_name = 'whatsapp_number'
  ) THEN
    EXECUTE $sql$
      UPDATE team_members
      SET whatsapp_number = NULL
      WHERE whatsapp_number ILIKE '%team-verified%'
         OR whatsapp_number ~ '[xX]{3,}'
    $sql$;
  END IF;
END $$;

-- ============================================================================
-- STEP 1C: Optional verification queries for manual review
-- ============================================================================

-- SELECT ref_number, transaction_type, category, bedrooms, size_sqft, price_aed, district
-- FROM properties
-- WHERE
--   (transaction_type = 'SALE' AND price_aed < 100000) OR
--   (transaction_type = 'RENT' AND price_aed > 2000000) OR
--   (size_sqft IS NOT NULL AND size_sqft < 150) OR
--   (size_sqft IS NOT NULL AND size_sqft > 30000)
-- ORDER BY price_aed ASC
-- LIMIT 50;

-- SELECT DISTINCT district, COUNT(*) AS listings, transaction_type
-- FROM properties
-- WHERE available = true
-- GROUP BY district, transaction_type
-- ORDER BY district;

-- SELECT COUNT(*) FROM team_members WHERE active = true;
-- SELECT id, name, role, whatsapp, active FROM team_members ORDER BY name;

-- ============================================================================
-- STEP 1D: Disable DB-backed patience/handoff flows safely
-- ============================================================================

DO $$
DECLARE
  has_conversation_flows boolean;
  has_cf_trigger_data boolean;
  has_cf_description boolean;
  has_cf_name boolean;
  has_flows boolean;
  has_flows_trigger_data boolean;
  has_flows_name boolean;
  has_flows_description boolean;
  has_flow_steps boolean;
  has_fs_config boolean;
  has_flow_triggers boolean;
  has_ft_trigger_type boolean;
  has_ft_keywords boolean;
  has_ft_message_template boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'conversation_flows'
  ) INTO has_conversation_flows;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversation_flows'
      AND column_name = 'trigger_data'
  ) INTO has_cf_trigger_data;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversation_flows'
      AND column_name = 'description'
  ) INTO has_cf_description;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversation_flows'
      AND column_name = 'name'
  ) INTO has_cf_name;

  IF has_conversation_flows AND has_cf_trigger_data THEN
    EXECUTE $sql$
      UPDATE conversation_flows
      SET active = false
      WHERE trigger_data::text ILIKE '%patience%'
         OR trigger_data::text ILIKE '%follow up%'
         OR trigger_data::text ILIKE '%specialist%'
    $sql$;
  END IF;

  IF has_conversation_flows AND has_cf_description THEN
    EXECUTE $sql$
      UPDATE conversation_flows
      SET active = false
      WHERE coalesce(description, '') ILIKE '%patience%'
         OR coalesce(description, '') ILIKE '%follow up%'
         OR coalesce(description, '') ILIKE '%specialist%'
    $sql$;
  END IF;

  IF has_conversation_flows AND has_cf_name THEN
    EXECUTE $sql$
      UPDATE conversation_flows
      SET active = false
      WHERE coalesce(name, '') ILIKE '%handoff%'
         OR coalesce(name, '') ILIKE '%agent%'
    $sql$;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'flows'
  ) INTO has_flows;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flows'
      AND column_name = 'trigger_data'
  ) INTO has_flows_trigger_data;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flows'
      AND column_name = 'name'
  ) INTO has_flows_name;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flows'
      AND column_name = 'description'
  ) INTO has_flows_description;

  IF has_flows AND has_flows_trigger_data THEN
    EXECUTE $sql$
      UPDATE flows
      SET active = false
      WHERE trigger_data::text ILIKE '%patience%'
         OR trigger_data::text ILIKE '%follow up%'
         OR trigger_data::text ILIKE '%specialist%'
    $sql$;
  END IF;

  IF has_flows AND has_flows_name THEN
    EXECUTE $sql$
      UPDATE flows
      SET active = false
      WHERE coalesce(name, '') ILIKE '%handoff%'
         OR coalesce(name, '') ILIKE '%agent%'
    $sql$;
  END IF;

  IF has_flows AND has_flows_description THEN
    EXECUTE $sql$
      UPDATE flows
      SET active = false
      WHERE coalesce(description, '') ILIKE '%patience%'
         OR coalesce(description, '') ILIKE '%follow up%'
         OR coalesce(description, '') ILIKE '%specialist%'
    $sql$;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'flow_steps'
  ) INTO has_flow_steps;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flow_steps'
      AND column_name = 'config'
  ) INTO has_fs_config;

  IF has_flows AND has_flow_steps AND has_fs_config THEN
    EXECUTE $sql$
      UPDATE flows
      SET active = false
      WHERE id IN (
        SELECT DISTINCT flow_id
        FROM flow_steps
        WHERE config::text ILIKE '%patience%'
           OR config::text ILIKE '%follow up shortly%'
           OR config::text ILIKE '%specialist%'
           OR config::text ILIKE '%agent%'
           OR config::text ILIKE '%meet%'
           OR config::text ILIKE '%contact%'
      )
    $sql$;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'flow_triggers'
  ) INTO has_flow_triggers;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flow_triggers'
      AND column_name = 'trigger_type'
  ) INTO has_ft_trigger_type;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flow_triggers'
      AND column_name = 'keywords'
  ) INTO has_ft_keywords;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'flow_triggers'
      AND column_name = 'message_template'
  ) INTO has_ft_message_template;

  IF has_flow_triggers AND has_ft_trigger_type AND has_ft_keywords AND has_ft_message_template THEN
    EXECUTE $sql$
      UPDATE flow_triggers
      SET active = false
      WHERE trigger_type = 'keyword'
        AND (
          keywords::text ILIKE '%agent%' OR
          keywords::text ILIKE '%meet%' OR
          keywords::text ILIKE '%contact%'
        )
        AND message_template ILIKE '%patience%'
    $sql$;
  END IF;
END $$;
