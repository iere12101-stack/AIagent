create or replace function get_nudge_stats(org_id uuid)
returns table (
  total_scheduled bigint,
  completed_24h bigint,
  completed_72h bigint,
  failed bigint,
  success_rate numeric
)
language plpgsql
as $$
begin
  return query
  with nudge_summary as (
    select
      count(*) as total,
      count(case when status = 'sent' and nudge_type = '24h' then 1 end) as sent_24h_count,
      count(case when status = 'sent' and nudge_type = '72h' then 1 end) as sent_72h_count,
      0::bigint as failed_count,
      count(case when status = 'sent' then 1 end) as completed_count
    from nudge_jobs
    where nudge_jobs.org_id = get_nudge_stats.org_id
  )
  select
    ns.total as total_scheduled,
    ns.sent_24h_count as completed_24h,
    ns.sent_72h_count as completed_72h,
    ns.failed_count as failed,
    case when ns.total > 0 then round((ns.completed_count::numeric / ns.total::numeric) * 100, 2) else 0 end as success_rate
  from nudge_summary ns;
end;
$$;

create or replace function get_nudge_report(
  org_id uuid,
  start_date timestamp,
  end_date timestamp
)
returns table (
  total_scheduled bigint,
  completed bigint,
  failed bigint,
  cancelled bigint,
  success_rate numeric,
  average_response_time numeric
)
language plpgsql
as $$
begin
  return query
  with nudge_report as (
    select
      count(*) as total,
      count(case when status = 'sent' then 1 end) as completed_count,
      0::bigint as failed_count,
      count(case when status = 'cancelled' then 1 end) as cancelled_count,
      avg(case when status = 'sent' and sent_at is not null then extract(epoch from (sent_at - scheduled_at)) / 3600 else null end) as avg_response_hours
    from nudge_jobs
    where nudge_jobs.org_id = get_nudge_report.org_id
      and created_at between start_date and end_date
  )
  select
    nr.total as total_scheduled,
    nr.completed_count as completed,
    nr.failed_count as failed,
    nr.cancelled_count as cancelled,
    case when nr.total > 0 then round((nr.completed_count::numeric / nr.total::numeric) * 100, 2) else 0 end as success_rate,
    coalesce(round(nr.avg_response_hours, 2), 0) as average_response_time
  from nudge_report nr;
end;
$$;

create or replace function get_nudge_effectiveness(org_id uuid)
returns table (
  twenty_four_hour_response_rate numeric,
  seventy_two_hour_response_rate numeric,
  overall_conversion_rate numeric,
  lead_score_improvement numeric
)
language plpgsql
as $$
begin
  return query
  with totals as (
    select
      count(case when nudge_type = '24h' then 1 end) as total_24h,
      count(case when nudge_type = '72h' then 1 end) as total_72h,
      count(distinct contact_id) as total_contacts
    from nudge_jobs
    where nudge_jobs.org_id = get_nudge_effectiveness.org_id
  ),
  sent_counts as (
    select
      count(case when nudge_type = '24h' and status = 'sent' then 1 end) as sent_24h,
      count(case when nudge_type = '72h' and status = 'sent' then 1 end) as sent_72h,
      count(distinct case when status = 'sent' then contact_id end) as sent_contacts
    from nudge_jobs
    where nudge_jobs.org_id = get_nudge_effectiveness.org_id
  ),
  converted as (
    select count(distinct b.contact_id) as converted_contacts
    from bookings b
    where b.org_id = get_nudge_effectiveness.org_id
      and b.status in ('scheduled', 'confirmed', 'completed')
  ),
  lead_scores as (
    select avg(c.lead_score::numeric) as average_score
    from contacts c
    where c.org_id = get_nudge_effectiveness.org_id
      and exists (
        select 1
        from nudge_jobs nj
        where nj.contact_id = c.id
          and nj.org_id = get_nudge_effectiveness.org_id
      )
  )
  select
    case when totals.total_24h > 0 then round((sent_counts.sent_24h::numeric / totals.total_24h::numeric) * 100, 2) else 0 end as twenty_four_hour_response_rate,
    case when totals.total_72h > 0 then round((sent_counts.sent_72h::numeric / totals.total_72h::numeric) * 100, 2) else 0 end as seventy_two_hour_response_rate,
    case when totals.total_contacts > 0 then round((converted.converted_contacts::numeric / totals.total_contacts::numeric) * 100, 2) else 0 end as overall_conversion_rate,
    coalesce(round(lead_scores.average_score, 2), 0) as lead_score_improvement
  from totals, sent_counts, converted, lead_scores;
end;
$$;

create or replace function calculate_agent_response_rate(agent_id uuid)
returns numeric
language plpgsql
as $$
declare
  total_messages bigint;
  responded_messages bigint;
  response_rate numeric;
begin
  select count(*) into total_messages
  from messages m
  join conversations c on m.conversation_id = c.id
  where c.assigned_to = agent_id
    and m.direction = 'inbound'
    and m.created_at >= now() - interval '30 days';

  select count(*) into responded_messages
  from messages m1
  join conversations c on m1.conversation_id = c.id
  join messages m2 on m1.conversation_id = m2.conversation_id
  where c.assigned_to = agent_id
    and m1.direction = 'inbound'
    and m2.direction = 'outbound'
    and m2.created_at > m1.created_at
    and m2.created_at <= m1.created_at + interval '1 hour'
    and m1.created_at >= now() - interval '30 days';

  if total_messages > 0 then
    response_rate := (responded_messages::numeric / total_messages::numeric) * 100;
  else
    response_rate := 0;
  end if;

  return round(response_rate, 2);
end;
$$;

create or replace function get_routing_stats(org_id uuid)
returns table (
  total_leads bigint,
  routed_by_escalation jsonb,
  routed_by_area jsonb,
  agent_workloads jsonb
)
language plpgsql
as $$
begin
  return query
  with escalation_counts as (
    select coalesce(jsonb_object_agg(lead_status, count), '{}'::jsonb) as payload
    from (
      select lead_status, count(*) as count
      from contacts
      where contacts.org_id = get_routing_stats.org_id
      group by lead_status
    ) counts
  ),
  area_counts as (
    select coalesce(jsonb_object_agg(area_interest, count), '{}'::jsonb) as payload
    from (
      select area_interest, count(*) as count
      from contacts
      where contacts.org_id = get_routing_stats.org_id
        and area_interest is not null
      group by area_interest
    ) counts
  ),
  workloads as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'agentId', tm.id,
          'agentName', tm.name,
          'activeLeads', coalesce(lead_counts.lead_count, 0),
          'avgResponseTime', coalesce(calculate_agent_response_rate(tm.id), 0)
        )
      ),
      '[]'::jsonb
    ) as payload
    from team_members tm
    left join (
      select assigned_to, count(*) as lead_count
      from contacts
      where org_id = get_routing_stats.org_id
        and assigned_to is not null
        and lead_status in ('warm', 'hot', 'boiling')
      group by assigned_to
    ) lead_counts on tm.id = lead_counts.assigned_to
    where tm.org_id = get_routing_stats.org_id
  )
  select
    (select count(*) from contacts where contacts.org_id = get_routing_stats.org_id) as total_leads,
    escalation_counts.payload as routed_by_escalation,
    area_counts.payload as routed_by_area,
    workloads.payload as agent_workloads
  from escalation_counts, area_counts, workloads;
end;
$$;
