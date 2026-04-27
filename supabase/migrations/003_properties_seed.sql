with target_org as (
  select id
  from organizations
  where slug = 'iere'
  order by created_at asc
  limit 1
),
area_pool as (
  select array[
    'Downtown Dubai', 'Dubai Marina', 'Business Bay', 'JBR', 'Palm Jumeirah', 'JVC', 'JLT', 'JVT',
    'DIFC', 'Arabian Ranches 3', 'Dubai Hills Estate', 'DAMAC Hills', 'DAMAC Hills 2', 'DAMAC Lagoons',
    'Arjan', 'Motor City', 'Dubai Sports City', 'Dubai Islands', 'Dubai Land Residence Complex',
    'Discovery Gardens', 'Majan', 'Liwan', 'Dubai Science Park', 'Dubai Silicon Oasis', 'Meydan',
    'Town Square', 'Al Furjan', 'International City', 'Al Wasl', 'Al Helio', 'Al Zorah', 'Aljada', 'Dubailand'
  ]::text[] as areas
),
generated_properties as (
  select
    gs as sequence_number,
    format('IERE-%03s', gs) as ref,
    case (gs - 1) % 4 when 0 then 'apartment' when 1 then 'villa' when 2 then 'townhouse' else 'penthouse' end as property_type,
    case when gs % 3 = 0 then 'rent' else 'sale' end as transaction_category,
    case when gs % 2 = 0 then 'ready' else 'off-plan' end as property_status,
    (select areas[((gs - 1) % array_length(areas, 1)) + 1] from area_pool) as district,
    format('Residence %s', ((gs - 1) % 18) + 1) as building,
    case (gs - 1) % 6 when 0 then 'Studio' when 1 then '1' when 2 then '2' when 3 then '3' when 4 then '4' else '5' end as bedrooms,
    case when gs % 3 = 0 then 65000 + (gs * 1250) else 950000 + (gs * 35000) end as price_aed,
    case (gs - 1) % 6 when 0 then 480 when 1 then 760 when 2 then 1180 when 3 then 1640 when 4 then 2210 else 3180 end as size_sqft,
    format('IERE seed listing %s in %s prepared for live search, matching, and carousel workflows.', gs, (select areas[((gs - 1) % array_length(areas, 1)) + 1] from area_pool)) as description
  from generate_series(1, 204) as gs
)
insert into properties (
  org_id, ref, ref_number, type, category, transaction_type, status, district, building,
  full_area, bedrooms, price_aed, size_sqft, available, description, last_updated
)
select
  target_org.id,
  generated_properties.ref,
  generated_properties.ref,
  generated_properties.property_type,
  generated_properties.transaction_category,
  case when generated_properties.transaction_category = 'sale' then 'SALE' else 'RENT' end,
  generated_properties.property_status,
  generated_properties.district,
  generated_properties.building,
  generated_properties.district,
  generated_properties.bedrooms,
  generated_properties.price_aed,
  generated_properties.size_sqft,
  true,
  generated_properties.description,
  current_date
from generated_properties
cross join target_org
on conflict (org_id, ref) do nothing;
