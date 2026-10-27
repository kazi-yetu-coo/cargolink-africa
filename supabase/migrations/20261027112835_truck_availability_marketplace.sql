-- Truck owners advertise space; shippers send targeted RFQs through existing bids/awards.
create table public.truck_listings (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 owner_id uuid not null references auth.users(id), review_owner_id uuid references auth.users(id),
 origin jsonb not null, destination jsonb not null, via text not null default '',
 truck_type text not null, capacity_kg numeric not null check(capacity_kg>0 and capacity_kg<=1000000),
 capacity_cbm numeric check(capacity_cbm>0 and capacity_cbm<=10000),
 available_from date not null, available_until date not null check(available_until>=available_from),
 notes text not null default '', status text not null default 'draft' check(status in ('draft','available','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.truck_listings enable row level security;
grant select on public.truck_listings to authenticated;
revoke insert,update,delete on public.truck_listings from anon,authenticated;
create policy "truck availability read" on public.truck_listings for select to authenticated using (
 public.review_record_visible(review_owner_id) and (
 (company_id=public.active_company_id() and owner_id=(select auth.uid())) or public.is_admin() or
 (status='available' and available_until>=current_date and exists(select 1 from public.companies c where c.id=company_id and c.role='trucker' and c.verification_status='verified' and not c.suspended))
 ));
create index truck_listings_availability_idx on public.truck_listings(status,available_until);
create index truck_listings_company_idx on public.truck_listings(company_id);
create index truck_listings_review_idx on public.truck_listings(review_owner_id);
alter table public.rfqs add column truck_listing_id uuid references public.truck_listings(id);
alter table public.rfqs add column target_company_id uuid references public.companies(id);
create index rfqs_target_company_idx on public.rfqs(target_company_id);
create index rfqs_truck_listing_idx on public.rfqs(truck_listing_id);

create or replace function public.save_truck_listing(p_id uuid,p_details jsonb,p_status text default 'draft') returns uuid
language plpgsql security definer set search_path='' as $$declare c public.companies%rowtype; rid uuid;begin
 select * into c from public.companies where id=public.active_company_id() and owner_id=auth.uid() and role='trucker' and not suspended;
 if auth.uid() is null or c.id is null then raise exception 'An active truck owner account is required';end if;
 if p_status is null or p_status not in ('draft','available','closed') or p_details is null or jsonb_typeof(p_details)<>'object' or length(p_details::text)>8000 then raise exception 'Invalid availability details';end if;
 if coalesce(length(trim(p_details#>>'{origin,name}')),0)<3 or coalesce(length(trim(p_details#>>'{destination,name}')),0)<3 or p_details->'origin'=p_details->'destination' then raise exception 'Enter different pickup and destination locations';end if;
 if coalesce(p_details->>'truckType','') not in ('Container trailer','Flatbed','Box truck','Refrigerated truck','Low loader','Tanker','Pickup / light truck','Tipper') then raise exception 'Select a truck type';end if;
 if coalesce((p_details->>'capacityKg')::numeric,0)<=0 or (p_details->>'capacityKg')::numeric>1000000 or (p_details->>'capacityKg')::numeric='NaN'::numeric then raise exception 'Enter valid available capacity in kg';end if;
 if p_details->>'availableFrom' is null or p_details->>'availableUntil' is null or (p_details->>'availableUntil')::date<(p_details->>'availableFrom')::date or length(coalesce(p_details->>'notes',''))>1000 or length(coalesce(p_details->>'via',''))>300 then raise exception 'Check availability dates and route notes';end if;
 if p_status='available' and (c.verification_status<>'verified' or (p_details->>'availableUntil')::date<current_date) then raise exception 'Verification and current availability dates are required to publish';end if;
 if p_id is null then
 insert into public.truck_listings(company_id,owner_id,review_owner_id,origin,destination,via,truck_type,capacity_kg,capacity_cbm,available_from,available_until,notes,status)
 values(c.id,auth.uid(),c.review_owner_id,p_details->'origin',p_details->'destination',coalesce(p_details->>'via',''),p_details->>'truckType',(p_details->>'capacityKg')::numeric,(p_details->>'capacityCbm')::numeric,(p_details->>'availableFrom')::date,(p_details->>'availableUntil')::date,coalesce(p_details->>'notes',''),p_status) returning id into rid;
 else update public.truck_listings set origin=p_details->'origin',destination=p_details->'destination',via=coalesce(p_details->>'via',''),truck_type=p_details->>'truckType',capacity_kg=(p_details->>'capacityKg')::numeric,capacity_cbm=(p_details->>'capacityCbm')::numeric,available_from=(p_details->>'availableFrom')::date,available_until=(p_details->>'availableUntil')::date,notes=coalesce(p_details->>'notes',''),status=p_status,updated_at=now() where id=p_id and owner_id=auth.uid() and company_id=c.id returning id into rid;
 if rid is null then raise exception 'Only your active company can edit this truck listing';end if;end if;
 insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),case when c.review_owner_id is null then 'Truck availability: ' else 'Admin review truck availability: ' end||p_status,rid);return rid;
end$$;
revoke all on function public.save_truck_listing(uuid,jsonb,text) from public,anon;
grant execute on function public.save_truck_listing(uuid,jsonb,text) to authenticated;

create or replace function public.attach_truck_listing() returns trigger language plpgsql security definer set search_path='' as $$declare t public.truck_listings%rowtype; c public.companies%rowtype;begin
 if nullif(new.details->>'truckListingId','') is null then
  if tg_op='UPDATE' and old.truck_listing_id is not null then raise exception 'A targeted inquiry must keep its selected truck';end if;
  new.truck_listing_id:=null;new.target_company_id:=null;return new;
 end if;
 select * into t from public.truck_listings where id=(new.details->>'truckListingId')::uuid;
 select * into c from public.companies where id=new.company_id;
 if t.id is null or new.service<>'Trucking' or c.role<>'shipper' or c.review_owner_id is distinct from t.review_owner_id or (t.review_owner_id is not null and (t.review_owner_id is distinct from auth.uid() or not public.is_admin())) then raise exception 'This truck listing is not available to this cargo owner';end if;
 if tg_op='UPDATE' and old.truck_listing_id is not null and old.truck_listing_id<>t.id then raise exception 'The selected truck cannot change after saving';end if;
 if new.status='open' then
  if t.status<>'available' or t.available_until<current_date or not exists(select 1 from public.companies where id=t.company_id and verification_status='verified' and not suspended) then raise exception 'This truck is no longer available; choose another listing';end if;
  if (new.details->>'date')::date<t.available_from or (new.details->>'date')::date>t.available_until or (new.details->>'weight')::numeric>t.capacity_kg or (t.capacity_cbm is not null and coalesce((new.details->>'volume')::numeric,0)>t.capacity_cbm) then raise exception 'Your cargo dates or capacity exceed this truck listing';end if;
 end if;
 new.truck_listing_id:=t.id;new.target_company_id:=t.company_id;return new;
end$$;
create trigger attach_truck_listing before insert or update of details,status,service on public.rfqs for each row execute function public.attach_truck_listing();
revoke all on function public.attach_truck_listing() from public,anon,authenticated;

-- Only the selected truck company sees and quotes a targeted inquiry.
drop policy "rfqs read" on public.rfqs;
create policy "rfqs read" on public.rfqs for select to authenticated using(public.review_record_visible(review_owner_id) and (owner_id=(select auth.uid()) or public.is_admin() or public.has_bid_on_rfq(id) or (status='open' and (target_company_id is null or target_company_id=public.active_company_id()) and exists(select 1 from public.companies c where c.id=public.active_company_id() and c.role in ('agent','trucker') and not c.suspended and (c.role='agent' or service in ('Trucking','Multimodal'))))));
create policy "targeted quote company" on public.bids as restrictive for insert to authenticated with check(exists(select 1 from public.rfqs r where r.id=rfq_id and (r.target_company_id is null or r.target_company_id=bids.company_id)));
create or replace function public.notify_truck_quote_request() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.target_company_id is not null and new.status='open' and (tg_op='INSERT' or old.status='draft') then
 insert into public.notifications(user_id,rfq_id,title,body) select owner_id,new.id,'New truck quote request','A shipper requested a quotation for your published route.' from public.companies where id=new.target_company_id;
 end if;return new;end$$;
create trigger truck_quote_request_notice after insert or update of status on public.rfqs for each row execute function public.notify_truck_quote_request();
revoke all on function public.notify_truck_quote_request() from public,anon,authenticated;
