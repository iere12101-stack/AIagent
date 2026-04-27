create table if not exists contact_memory (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  unique (contact_id, key)
);

create index if not exists idx_contact_memory_contact_id
  on contact_memory(contact_id);

drop trigger if exists contact_memory_set_updated_at on contact_memory;

create trigger contact_memory_set_updated_at
before update on contact_memory
for each row
execute function public.set_updated_at();

update properties
set
  ref_number = case when ref_number ~* 'team-verified|placeholder|\[|\{' then null else ref_number end,
  building = case when building ~* 'team-verified|placeholder|\[|\{' then null else building end,
  agent_name = case when agent_name ~* 'team-verified|placeholder|\[|\{' then 'IERE Team' else agent_name end,
  description = case when description ~* 'team-verified|placeholder|\[|\{' then null else description end;

update team_members
set
  whatsapp = case when whatsapp ~* 'team-verified|X{2,}|placeholder' then null else whatsapp end;
