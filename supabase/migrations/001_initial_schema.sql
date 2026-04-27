create extension if not exists vector;
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'admin' check (role in ('owner', 'admin', 'operator', 'member', 'viewer')),
  avatar text,
  password_hash text not null,
  preferences jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, email)
);

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'connecting')),
  last_seen timestamptz,
  qr_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  source_type text not null default 'document',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'new_contact',
  trigger_data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  role text not null check (role in ('CEO', 'Sales Manager', 'Agent', 'Receptionist')),
  whatsapp text not null,
  email text not null,
  area_speciality text[] not null default '{}'::text[],
  budget_threshold_aed numeric,
  avatar_url text,
  active boolean not null default true,
  notes text,
  speciality_areas text[] not null default '{}'::text[],
  route_to text check (route_to in ('VIP', 'HOT', 'WARM', 'SUPPORT')),
  min_budget_aed numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  system_prompt text not null,
  knowledge_base_id uuid references knowledge_bases(id) on delete set null,
  default_flow_id uuid references flows(id) on delete set null,
  temperature double precision not null default 0.7,
  max_tokens integer not null default 1000,
  active boolean not null default true,
  handoff_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ref text not null,
  type text check (type in ('apartment', 'villa', 'townhouse', 'penthouse')),
  category text check (category in ('sale', 'rent')),
  status text check (status in ('ready', 'off-plan')),
  district text not null,
  building text,
  bedrooms text,
  price_aed numeric not null,
  size_sqft numeric,
  agent_id uuid references team_members(id) on delete set null,
  available boolean not null default true,
  description text,
  image_urls text[] not null default '{}'::text[],
  amenities text[] not null default '{}'::text[],
  ref_number text,
  transaction_type text check (transaction_type in ('SALE', 'RENT')),
  full_area text,
  agent_name text,
  agent_whatsapp text,
  bathrooms text,
  permit_number text,
  portal text,
  listed_on date,
  last_updated date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, ref)
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  phone text not null,
  name text,
  email text,
  push_name text,
  contact_memory jsonb not null default '{}'::jsonb,
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  lead_status text not null default 'new' check (lead_status in ('new', 'cold', 'warm', 'hot', 'boiling', 'converted', 'lost')),
  language text not null default 'en' check (language in ('en', 'ar')),
  intent text check (intent in ('buy', 'rent', 'invest', 'browse')),
  area_interest text,
  bedrooms text,
  budget text,
  timeline text,
  notes text,
  assigned_to uuid references team_members(id) on delete set null,
  handled_by text not null default 'ai' check (handled_by in ('ai', 'human')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, phone)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'resolved', 'archived')),
  handled_by text not null default 'ai' check (handled_by in ('ai', 'human')),
  assigned_to uuid references team_members(id) on delete set null,
  lead_score integer not null default 0,
  detected_intent text,
  detected_lang text not null default 'en',
  last_message_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists baileys_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  key_type text not null,
  key_id text not null,
  data text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, key_type, key_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_type text not null default 'ai' check (sender_type in ('ai', 'human', 'contact', 'system')),
  sender_name text,
  content text not null,
  message_type text not null default 'text',
  wa_message_id text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read', 'failed')),
  delivered_at timestamptz,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  knowledge_base_id uuid not null references knowledge_bases(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flow_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  flow_id uuid not null references flows(id) on delete cascade,
  step_order integer not null,
  step_type text not null check (step_type in ('send_message', 'ask_question', 'ai_response', 'condition', 'action', 'handoff', 'booking')),
  config jsonb not null default '{}'::jsonb,
  next_step_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contact_flows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  flow_id uuid not null references flows(id) on delete cascade,
  current_step jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, flow_id)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  agent_name text,
  agent_whatsapp text,
  property_ref text,
  property_area text,
  scheduled_date timestamptz not null,
  scheduled_time text not null,
  duration_minutes integer not null default 30,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_scores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  score integer not null check (score between 0 and 100),
  factors jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nudge_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  nudge_type text not null check (nudge_type in ('24h', '72h')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  message_en text,
  message_ar text,
  message_sent text,
  language text not null default 'en',
  completed_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists handoff_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  triggered_by text not null check (triggered_by in ('keyword', 'max_turns', 'manual', 'flow', 'sentiment')),
  trigger_value text,
  assigned_to uuid references team_members(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'resolved')),
  priority text not null default 'high' check (priority in ('low', 'medium', 'high', 'urgent')),
  accepted_at timestamptz,
  rejected_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.sync_legacy_compatibility_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'properties' then
    new.ref_number := coalesce(new.ref_number, new.ref);
    new.transaction_type := coalesce(new.transaction_type, case when new.category = 'sale' then 'SALE' when new.category = 'rent' then 'RENT' else null end);
    new.full_area := coalesce(new.full_area, new.district);
    new.last_updated := coalesce(new.last_updated, current_date);
  elsif tg_table_name = 'team_members' then
    if coalesce(array_length(new.area_speciality, 1), 0) = 0 then
      new.area_speciality := coalesce(new.speciality_areas, '{}'::text[]);
    end if;
    if coalesce(array_length(new.speciality_areas, 1), 0) = 0 then
      new.speciality_areas := coalesce(new.area_speciality, '{}'::text[]);
    end if;
    new.min_budget_aed := coalesce(new.min_budget_aed, new.budget_threshold_aed);
    new.budget_threshold_aed := coalesce(new.budget_threshold_aed, new.min_budget_aed);
    new.route_to := coalesce(new.route_to, case when new.role = 'CEO' then 'VIP' when new.role = 'Sales Manager' then 'HOT' else 'WARM' end);
  elsif tg_table_name = 'nudge_jobs' then
    new.message_sent := coalesce(new.message_sent, new.message_en, new.message_ar);
    if new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
    if new.status = 'sent' and new.completed_at is null then
      new.completed_at := coalesce(new.sent_at, now());
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_related_org_id()
returns trigger
language plpgsql
as $$
begin
  if new.org_id is not null then
    return new;
  end if;

  if tg_table_name = 'messages' then
    select org_id into new.org_id from conversations where id = new.conversation_id;
  elsif tg_table_name = 'lead_scores' then
    select org_id into new.org_id from contacts where id = new.contact_id;
  elsif tg_table_name = 'flow_steps' then
    select org_id into new.org_id from flows where id = new.flow_id;
  elsif tg_table_name = 'contact_flows' then
    select org_id into new.org_id from contacts where id = new.contact_id;
  elsif tg_table_name = 'bookings' then
    select org_id into new.org_id from contacts where id = new.contact_id;
  end if;

  return new;
end;
$$;

create or replace view whatsapp_devices as
select id, org_id, name, phone, status, last_seen, qr_code, created_at, updated_at
from devices;

create or replace view ai_agents as
select id, org_id, name, system_prompt, knowledge_base_id, default_flow_id, temperature, max_tokens, active, handoff_count, created_at, updated_at
from agents;

create or replace view conversation_flows as
select id, org_id, name, description, trigger_type, trigger_data, active, created_at, updated_at
from flows;

create or replace view wa_session_keys as
select id, org_id, device_id, key_type as key_name, key_id, data as value, 'v1'::text as key_version, created_at, updated_at
from baileys_sessions;

create unique index if not exists idx_messages_conversation_cursor on messages(conversation_id, created_at desc, id desc);
create index if not exists idx_devices_org_id on devices(org_id);
create index if not exists idx_baileys_sessions_org_id on baileys_sessions(org_id);
create index if not exists idx_baileys_sessions_device_id on baileys_sessions(device_id);
create index if not exists idx_contacts_org_id on contacts(org_id);
create index if not exists idx_contacts_assigned_to on contacts(assigned_to);
create index if not exists idx_conversations_org_id on conversations(org_id);
create index if not exists idx_conversations_contact_id on conversations(contact_id);
create index if not exists idx_conversations_device_id on conversations(device_id);
create index if not exists idx_messages_org_id on messages(org_id);
create index if not exists idx_agents_org_id on agents(org_id);
create index if not exists idx_properties_org_id on properties(org_id);
create index if not exists idx_properties_agent_id on properties(agent_id);
create index if not exists idx_team_members_org_id on team_members(org_id);
create index if not exists idx_knowledge_bases_org_id on knowledge_bases(org_id);
create index if not exists idx_knowledge_chunks_org_id on knowledge_chunks(org_id);
create index if not exists idx_knowledge_chunks_kb_id on knowledge_chunks(knowledge_base_id);
create index if not exists idx_flows_org_id on flows(org_id);
create index if not exists idx_flow_steps_org_id on flow_steps(org_id);
create index if not exists idx_flow_steps_flow_id on flow_steps(flow_id);
create index if not exists idx_contact_flows_org_id on contact_flows(org_id);
create index if not exists idx_contact_flows_contact_id on contact_flows(contact_id);
create index if not exists idx_contact_flows_flow_id on contact_flows(flow_id);
create index if not exists idx_bookings_org_id on bookings(org_id);
create index if not exists idx_bookings_contact_id on bookings(contact_id);
create index if not exists idx_bookings_conversation_id on bookings(conversation_id);
create index if not exists idx_lead_scores_org_id on lead_scores(org_id);
create index if not exists idx_lead_scores_contact_id on lead_scores(contact_id);
create index if not exists idx_lead_scores_conversation_id on lead_scores(conversation_id);
create index if not exists idx_nudge_jobs_org_id on nudge_jobs(org_id);
create index if not exists idx_nudge_jobs_contact_id on nudge_jobs(contact_id);
create index if not exists idx_nudge_jobs_device_id on nudge_jobs(device_id);
create index if not exists idx_handoff_events_org_id on handoff_events(org_id);
create index if not exists idx_handoff_events_conversation_id on handoff_events(conversation_id);
create index if not exists idx_handoff_events_contact_id on handoff_events(contact_id);
create index if not exists idx_handoff_events_assigned_to on handoff_events(assigned_to);

create trigger sync_legacy_properties before insert or update on properties for each row execute function public.sync_legacy_compatibility_fields();
create trigger sync_legacy_team_members before insert or update on team_members for each row execute function public.sync_legacy_compatibility_fields();
create trigger sync_legacy_nudge_jobs before insert or update on nudge_jobs for each row execute function public.sync_legacy_compatibility_fields();

create trigger set_messages_org_id before insert on messages for each row execute function public.set_related_org_id();
create trigger set_flow_steps_org_id before insert on flow_steps for each row execute function public.set_related_org_id();
create trigger set_contact_flows_org_id before insert on contact_flows for each row execute function public.set_related_org_id();
create trigger set_lead_scores_org_id before insert on lead_scores for each row execute function public.set_related_org_id();
create trigger set_bookings_org_id before insert on bookings for each row execute function public.set_related_org_id();

create trigger organizations_set_updated_at before update on organizations for each row execute function public.set_updated_at();
create trigger users_set_updated_at before update on users for each row execute function public.set_updated_at();
create trigger devices_set_updated_at before update on devices for each row execute function public.set_updated_at();
create trigger knowledge_bases_set_updated_at before update on knowledge_bases for each row execute function public.set_updated_at();
create trigger flows_set_updated_at before update on flows for each row execute function public.set_updated_at();
create trigger team_members_set_updated_at before update on team_members for each row execute function public.set_updated_at();
create trigger agents_set_updated_at before update on agents for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on properties for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on contacts for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on conversations for each row execute function public.set_updated_at();
create trigger baileys_sessions_set_updated_at before update on baileys_sessions for each row execute function public.set_updated_at();
create trigger messages_set_updated_at before update on messages for each row execute function public.set_updated_at();
create trigger knowledge_chunks_set_updated_at before update on knowledge_chunks for each row execute function public.set_updated_at();
create trigger flow_steps_set_updated_at before update on flow_steps for each row execute function public.set_updated_at();
create trigger contact_flows_set_updated_at before update on contact_flows for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on bookings for each row execute function public.set_updated_at();
create trigger lead_scores_set_updated_at before update on lead_scores for each row execute function public.set_updated_at();
create trigger nudge_jobs_set_updated_at before update on nudge_jobs for each row execute function public.set_updated_at();
create trigger handoff_events_set_updated_at before update on handoff_events for each row execute function public.set_updated_at();
