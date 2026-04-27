insert into organizations (name, slug, plan, settings)
values ('Investment Experts Real Estate', 'iere', 'pro', '{"timezone":"Asia/Dubai","language":"en"}'::jsonb)
on conflict (slug) do nothing;

with target_org as (
  select id
  from organizations
  where slug = 'iere'
  limit 1
)
insert into users (org_id, email, name, role, password_hash)
select
  target_org.id,
  'admin@iere.ae',
  'IERE Admin',
  'owner',
  '$2b$10$KYVbZ5JFVfqu0oV98LnF5eTk4QTe2e4PQG7QNYfhumEpGdi/867AO'
from target_org
on conflict do nothing;

with target_org as (
  select id
  from organizations
  where slug = 'iere'
  limit 1
)
insert into team_members (
  org_id, name, role, whatsapp, email, area_speciality, speciality_areas,
  budget_threshold_aed, min_budget_aed, route_to, active, notes
)
select
  target_org.id,
  members.name,
  members.role,
  members.whatsapp,
  members.email,
  members.area_speciality,
  members.area_speciality,
  members.budget_threshold_aed,
  members.budget_threshold_aed,
  members.route_to,
  true,
  members.notes
from target_org
cross join (
  values
    ('Muhammad Imran Khan', 'CEO', '+971527750818', 'imran@investmentexpertsre.com', array['All Areas']::text[], 5000000::numeric, 'VIP', 'Alerted on ALL 5M+ leads + daily summary'),
    ('Sarah Shaheen', 'Sales Manager', '+971527438388', 'sarah@investmentexpertsre.com', array['All Areas']::text[], 2000000::numeric, 'HOT', 'Alerted on 2M+ leads, manages all agents'),
    ('Laiba Shahzad', 'Agent', '+971552285188', 'laiba@investmentexpertsre.com', array['Jumeirah Village Circle','Jumeirah Lake Towers','Majan','Dubai Land Residence Complex','Al Zorah']::text[], 0::numeric, 'WARM', 'Specialist: JVC, JLT, Majan, DLRC, Al Zorah'),
    ('Waheed Uz Zaman', 'Agent', '+971559821786', 'waheed@investmentexpertsre.com', array['Dubai Marina','Arjan','Dubai Sports City','Motor City']::text[], 0::numeric, 'WARM', 'Specialist: Dubai Marina, Arjan, DSC, Motor City'),
    ('SAROSH IQBAL', 'Agent', '+971527438388', 'sarosh@investmentexpertsre.com', array['Business Bay','Downtown Dubai','DIFC']::text[], 0::numeric, 'WARM', 'Specialist: Business Bay, Downtown'),
    ('Agent 6', 'Agent', '+971501112233', 'agent6@investmentexpertsre.com', array['general']::text[], 0::numeric, 'WARM', 'Fallback agent for unmatched area enquiries')
) as members(name, role, whatsapp, email, area_speciality, budget_threshold_aed, route_to, notes)
on conflict do nothing;

with target_org as (
  select id
  from organizations
  where slug = 'iere'
  limit 1
)
insert into agents (org_id, name, system_prompt, temperature, max_tokens, active)
select
  target_org.id,
  'Aya - IERE Main',
  'You are Aya, an expert real estate AI consultant for Investment Experts Real Estate (IERE), Dubai. Understand client needs, qualify leads, show matching properties, answer market questions, book viewings. Always reply in the same language as the client.',
  0.7,
  1000,
  true
from target_org
on conflict do nothing;

with target_org as (
  select id
  from organizations
  where slug = 'iere'
  limit 1
)
insert into knowledge_bases (org_id, name, description, source_type)
select
  target_org.id,
  'Dubai Market FAQ',
  'Common questions about Dubai real estate market, DLD fees, visa rules',
  'document'
from target_org
on conflict do nothing;

with target_org as (
  select id
  from organizations
  where slug = 'iere'
  limit 1
)
insert into flows (org_id, name, description, trigger_type, active)
select
  target_org.id,
  'Default Property Enquiry',
  'Handles new property enquiries with area, budget, and bedroom qualification',
  'new_contact',
  true
from target_org
on conflict do nothing;
