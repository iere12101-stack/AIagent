with target_org as (
  select id
  from organizations
  where slug = 'iere'
  order by created_at asc
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
    ('Muhammad Imran Khan', 'CEO', '+971527750818', 'imran@investmentexpertsre.com', array['all']::text[], 5000000::numeric, 'VIP', 'Alerted on ALL 5M+ leads + daily summary'),
    ('Sarah Shaheen', 'Sales Manager', '+971527438388', 'sarah@investmentexpertsre.com', array['all']::text[], 2000000::numeric, 'HOT', 'Alerted on 2M+ leads, manages all agents'),
    ('Laiba Shahzad', 'Agent', '+971552285188', 'laiba@investmentexpertsre.com', array['JVC','JLT','Majan','DLRC','Al Zorah']::text[], null::numeric, 'WARM', 'Specialist: JVC, JLT, Majan, DLRC, Al Zorah'),
    ('Waheed Uz Zaman', 'Agent', '+971559821786', 'waheed@investmentexpertsre.com', array['Dubai Marina','Arjan','Dubai Sports City','Motor City']::text[], null::numeric, 'WARM', 'Specialist: Dubai Marina, Arjan, DSC, Motor City'),
    ('SAROSH IQBAL', 'Agent', '+971527438388', 'sarosh@investmentexpertsre.com', array['Business Bay','Downtown Dubai']::text[], null::numeric, 'WARM', 'Specialist: Business Bay, Downtown'),
    ('Agent 6', 'Agent', '+971501112233', 'agent6@investmentexpertsre.com', array['general']::text[], null::numeric, 'WARM', 'General fallback routing agent for unmatched area enquiries.')
) as members(name, role, whatsapp, email, area_speciality, budget_threshold_aed, route_to, notes)
on conflict do nothing;
