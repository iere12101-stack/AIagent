create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '')::uuid
$$;

alter table organizations enable row level security;
alter table users enable row level security;
alter table devices enable row level security;
alter table baileys_sessions enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table agents enable row level security;
alter table properties enable row level security;
alter table team_members enable row level security;
alter table knowledge_bases enable row level security;
alter table knowledge_chunks enable row level security;
alter table flows enable row level security;
alter table flow_steps enable row level security;
alter table contact_flows enable row level security;
alter table bookings enable row level security;
alter table lead_scores enable row level security;
alter table nudge_jobs enable row level security;
alter table handoff_events enable row level security;

drop policy if exists org_isolation on organizations;
create policy org_isolation on organizations using (id = public.current_org_id());

drop policy if exists org_isolation on users;
create policy org_isolation on users using (org_id = public.current_org_id());

drop policy if exists org_isolation on devices;
create policy org_isolation on devices using (org_id = public.current_org_id());

drop policy if exists org_isolation on baileys_sessions;
create policy org_isolation on baileys_sessions using (org_id = public.current_org_id());

drop policy if exists org_isolation on contacts;
create policy org_isolation on contacts using (org_id = public.current_org_id());

drop policy if exists org_isolation on conversations;
create policy org_isolation on conversations using (org_id = public.current_org_id());

drop policy if exists org_isolation on messages;
create policy org_isolation on messages using (org_id = public.current_org_id());

drop policy if exists org_isolation on agents;
create policy org_isolation on agents using (org_id = public.current_org_id());

drop policy if exists org_isolation on properties;
create policy org_isolation on properties using (org_id = public.current_org_id());

drop policy if exists org_isolation on team_members;
create policy org_isolation on team_members using (org_id = public.current_org_id());

drop policy if exists org_isolation on knowledge_bases;
create policy org_isolation on knowledge_bases using (org_id = public.current_org_id());

drop policy if exists org_isolation on knowledge_chunks;
create policy org_isolation on knowledge_chunks using (org_id = public.current_org_id());

drop policy if exists org_isolation on flows;
create policy org_isolation on flows using (org_id = public.current_org_id());

drop policy if exists org_isolation on flow_steps;
create policy org_isolation on flow_steps using (org_id = public.current_org_id());

drop policy if exists org_isolation on contact_flows;
create policy org_isolation on contact_flows using (org_id = public.current_org_id());

drop policy if exists org_isolation on bookings;
create policy org_isolation on bookings using (org_id = public.current_org_id());

drop policy if exists org_isolation on lead_scores;
create policy org_isolation on lead_scores using (org_id = public.current_org_id());

drop policy if exists org_isolation on nudge_jobs;
create policy org_isolation on nudge_jobs using (org_id = public.current_org_id());

drop policy if exists org_isolation on handoff_events;
create policy org_isolation on handoff_events using (org_id = public.current_org_id());
