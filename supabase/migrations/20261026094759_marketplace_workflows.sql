-- Additive upgrade for the existing CargoLink Africa schema.
alter table public.companies add column if not exists country text not null default '';
alter table public.companies add column if not exists city text not null default '';
alter table public.companies add column if not exists services text[] not null default '{}';
alter table public.companies add column if not exists suspended boolean not null default false;
alter table public.rfqs drop constraint if exists rfqs_service_check;
alter table public.rfqs add constraint rfqs_service_check check(service in ('Ocean Freight','Air Freight','Trucking','Rail Freight','Multimodal','Customs Clearance','Warehousing'));
alter table public.rfqs drop constraint if exists rfqs_status_check;
alter table public.rfqs add constraint rfqs_status_check check(status in ('draft','open','awarded','closed','completed'));
alter table public.rfqs add column if not exists progress text not null default 'Awaiting pickup' check(progress in ('Awaiting pickup','Picked up','In transit','At customs','Out for delivery','Delivered'));
alter table public.bids add column if not exists freight_charges numeric check(freight_charges>=0);
alter table public.bids add column if not exists customs_fees numeric check(customs_fees>=0);
alter table public.bids add column if not exists inland_charges numeric check(inland_charges>=0);
alter table public.bids add column if not exists other_charges numeric check(other_charges>=0);
alter table public.bids add column if not exists valid_until date;
alter table public.bids add column if not exists scope text;
alter table public.bids add column if not exists inclusions text[] not null default '{}';
alter table public.bids add column if not exists exclusions text not null default '';
alter table public.bids add column if not exists terms text not null default '';
create table if not exists public.saved_providers(user_id uuid references auth.users(id) on delete cascade,company_id uuid references public.companies(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,company_id));
create table if not exists public.shipment_events(id uuid primary key default gen_random_uuid(),rfq_id uuid not null references public.rfqs(id),actor_id uuid not null references auth.users(id),milestone text not null,note text not null default '',created_at timestamptz not null default now());
create table if not exists public.marketplace_activity(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id),action text not null,record_id uuid,created_at timestamptz not null default now());
create table if not exists public.support_requests(id uuid primary key default gen_random_uuid(),email text not null check(length(email) between 3 and 254 and position('@' in email)>1),message text not null check(length(message) between 10 and 4000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now());
alter table public.saved_providers enable row level security;
alter table public.shipment_events enable row level security;
alter table public.marketplace_activity enable row level security;
alter table public.support_requests enable row level security;
create policy "saved providers owner read" on public.saved_providers for select to authenticated using(user_id=(select auth.uid()));
create policy "saved providers owner add" on public.saved_providers for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.companies where id=company_id and verification_status='verified' and not suspended));
create policy "saved providers owner remove" on public.saved_providers for delete to authenticated using(user_id=(select auth.uid()));
create policy "shipment participants read" on public.shipment_events for select to authenticated using(public.owns_rfq(rfq_id) or public.has_bid_on_rfq(rfq_id) or public.is_admin());
create policy "activity admin read" on public.marketplace_activity for select to authenticated using(public.is_admin());
create policy "support admin read" on public.support_requests for select to authenticated using(public.is_admin());
create policy "support submit" on public.support_requests for insert to anon,authenticated with check(status='open');
create policy "support admin update" on public.support_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,delete on public.saved_providers to authenticated;
grant select on public.shipment_events,public.marketplace_activity to authenticated;
grant insert(email,message) on public.support_requests to anon,authenticated;
grant select,update(status) on public.support_requests to authenticated;
-- Suspended accounts cannot write through workflow APIs or see marketplace inquiries.
create or replace function public.is_verified_provider(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.companies c join public.company_members m on m.company_id=c.id where c.id=cid and c.verification_status='verified' and not c.suspended and c.role in ('agent','trucker') and m.user_id=(select auth.uid()))$$;
create or replace function public.register_company(p_name text,p_role text) returns uuid language plpgsql security definer set search_path='' as $$declare cid uuid;begin
if auth.uid() is null then raise exception 'Sign in required';end if;
if length(trim(p_name)) not between 2 and 150 or p_role not in ('shipper','agent','trucker') then raise exception 'Invalid company details';end if;
perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
select id into cid from public.companies where owner_id=auth.uid() order by created_at limit 1;if found then return cid;end if;
insert into public.companies(owner_id,name,role) values(auth.uid(),trim(p_name),p_role) returning id into cid;
insert into public.company_members(company_id,user_id,role) values(cid,auth.uid(),'owner');return cid;end$$;
create or replace function public.update_company_profile(p_company_id uuid,p_name text,p_country text,p_city text,p_services text[]) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or not exists(select 1 from public.companies where id=p_company_id and owner_id=auth.uid() and not suspended) then raise exception 'Not authorized';end if;
if length(trim(p_name)) not between 2 and 150 or length(p_country)>100 or length(p_city)>100 or cardinality(p_services)>20 then raise exception 'Invalid company details';end if;
update public.companies set name=trim(p_name),country=p_country,city=p_city,services=p_services where id=p_company_id;end$$;
create or replace function public.save_rfq(p_id uuid,p_service text,p_details jsonb,p_notes text,p_submit boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare cid uuid;rid uuid;begin
select id into cid from public.companies where owner_id=auth.uid() and role='shipper' and not suspended limit 1;
if cid is null then raise exception 'An active cargo owner account is required';end if;
if p_service not in ('Ocean Freight','Air Freight','Trucking','Rail Freight','Multimodal','Customs Clearance','Warehousing') or jsonb_typeof(p_details)<>'object' or length(p_details::text)>20000 or length(p_notes)>4000 then raise exception 'Invalid shipment details';end if;
if p_submit then
if coalesce(p_details#>>'{origin,name}','')='' or (p_service<>'Warehousing' and coalesce(p_details#>>'{destination,name}','')='') or coalesce(trim(p_details->>'cargo'),'')='' or coalesce((p_details->>'weight')::numeric,0)<=0 or coalesce((p_details->>'date')::date,'1900-01-01')<current_date then raise exception 'Origin, destination, cargo, positive weight and a future ready date are required';end if;
if p_details->'origin'=p_details->'destination' and p_service<>'Warehousing' then raise exception 'Origin and destination must differ';end if;
if coalesce((p_details->>'volume')::numeric,0)<0 or (p_details->>'deliveryDate')::date<(p_details->>'date')::date then raise exception 'Invalid volume or delivery date';end if;
end if;
if p_id is null then insert into public.rfqs(owner_id,company_id,service,details,notes,status) values(auth.uid(),cid,p_service,p_details,p_notes,case when p_submit then 'open' else 'draft' end) returning id into rid;
else update public.rfqs set service=p_service,details=p_details,notes=p_notes,status=case when p_submit then 'open' else 'draft' end where id=p_id and owner_id=auth.uid() and status='draft' returning id into rid;if rid is null then raise exception 'Only your own draft inquiries can be edited';end if;end if;
insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),case when p_submit then 'Inquiry submitted' else 'Draft saved' end,rid);return rid;end$$;
-- Existing direct insert clients remain supported, with the same server-side validation.
create or replace function public.validate_marketplace_insert() returns trigger language plpgsql security invoker set search_path='' as $$begin
if tg_table_name='rfqs' then
if not exists(select 1 from public.companies where id=new.company_id and owner_id=auth.uid() and role='shipper' and not suspended) then raise exception 'Active cargo owner required';end if;
if new.status='open' and (coalesce(new.details#>>'{origin,name}','')='' or (new.service<>'Warehousing' and coalesce(new.details#>>'{destination,name}','')='') or coalesce(trim(new.details->>'cargo'),'')='' or coalesce((new.details->>'weight')::numeric,0)<=0 or coalesce((new.details->>'date')::date,'1900-01-01')<current_date) then raise exception 'Complete route, cargo, weight and ready date are required';end if;
else
if new.status<>'submitted' then raise exception 'New bids must be submitted';end if;
if new.valid_until is not null and new.valid_until<current_date then raise exception 'Quotation validity has expired';end if;
if new.freight_charges is not null and new.customs_fees is not null and new.inland_charges is not null and new.other_charges is not null and new.amount<>new.freight_charges+new.customs_fees+new.inland_charges+new.other_charges then raise exception 'Charge breakdown must equal total';end if;
end if;return new;end$$;
create trigger validate_rfq_insert before insert on public.rfqs for each row execute function public.validate_marketplace_insert();
create trigger validate_bid_insert before insert on public.bids for each row execute function public.validate_marketplace_insert();
drop policy if exists "bids create" on public.bids;
create policy "bids create" on public.bids for insert to authenticated with check(provider_id=(select auth.uid()) and public.is_verified_provider(company_id) and exists(select 1 from public.rfqs r join public.companies provider on provider.id=bids.company_id where r.id=rfq_id and r.status='open' and r.owner_id<>(select auth.uid()) and (provider.role='agent' or (provider.role='trucker' and r.service in ('Trucking','Multimodal')))));
drop policy if exists "rfqs read" on public.rfqs;
create policy "rfqs read" on public.rfqs for select to authenticated using(owner_id=(select auth.uid()) or public.is_admin() or public.has_bid_on_rfq(id) or (status='open' and exists(select 1 from public.companies c where c.owner_id=(select auth.uid()) and c.role in ('agent','trucker') and not c.suspended and (c.role='agent' or service in ('Trucking','Multimodal')))));
drop policy if exists "bids read" on public.bids;
create policy "bids read" on public.bids for select to authenticated using(provider_id=(select auth.uid()) or public.owns_rfq(rfq_id) or public.is_admin());
-- Company owners cannot bypass onboarding to create multiple companies or memberships.
revoke insert on public.companies,public.company_members from authenticated;
create or replace function public.award_bid(p_rfq_id uuid,p_bid_id uuid) returns void language plpgsql security definer set search_path='' as $$declare r public.rfqs%rowtype;b public.bids%rowtype;begin
select * into r from public.rfqs where id=p_rfq_id for update;
if auth.uid() is null or r.owner_id is distinct from auth.uid() or r.status<>'open' or exists(select 1 from public.companies where id=r.company_id and suspended) then raise exception 'Not authorized or inquiry is not open';end if;
select * into b from public.bids where id=p_bid_id and rfq_id=p_rfq_id and status='submitted';
if not found or (b.valid_until is not null and b.valid_until<current_date) or not exists(select 1 from public.companies where id=b.company_id and verification_status='verified' and not suspended) then raise exception 'Quotation is expired, invalid or from an unverified provider';end if;
update public.rfqs set status='awarded',awarded_bid_id=b.id where id=r.id;
update public.bids set status=case when id=b.id then 'awarded' else 'not_selected' end where rfq_id=r.id;
insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),'Quotation awarded',r.id);end$$;
create or replace function public.manage_rfq_status(p_rfq_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or p_status not in ('open','closed') then raise exception 'Invalid request';end if;
if p_status='open' then raise exception 'Use the RFQ editor to publish a validated draft. Closed inquiries must be recreated.';end if;
update public.rfqs set status='closed' where id=p_rfq_id and status in ('draft','open') and (owner_id=auth.uid() or public.is_admin()) and not exists(select 1 from public.companies c where c.owner_id=auth.uid() and c.suspended);
if not found then raise exception 'Not authorized or inquiry cannot be closed';end if;
insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),'Inquiry closed',p_rfq_id);end$$;
create or replace function public.update_shipment(p_rfq_id uuid,p_milestone text,p_note text default '') returns void language plpgsql security definer set search_path='' as $$declare r public.rfqs%rowtype;begin
select * into r from public.rfqs where id=p_rfq_id for update;
if auth.uid() is null or r.status<>'awarded' or not exists(select 1 from public.bids b join public.companies c on c.id=b.company_id where b.id=r.awarded_bid_id and b.provider_id=auth.uid() and not c.suspended) then raise exception 'Only the awarded provider can update this shipment';end if;
if p_milestone not in ('Awaiting pickup','Picked up','In transit','At customs','Out for delivery','Delivered') or length(p_note)>1000 then raise exception 'Invalid milestone';end if;
update public.rfqs set progress=p_milestone,status=case when p_milestone='Delivered' then 'completed' else status end where id=r.id;
insert into public.shipment_events(rfq_id,actor_id,milestone,note) values(r.id,auth.uid(),p_milestone,p_note);
insert into public.notifications(user_id,rfq_id,title,body) values(r.owner_id,r.id,'Shipment status update',p_milestone||case when p_note<>'' then ': '||p_note else '' end);end$$;
create or replace function public.moderate_company(p_company_id uuid,p_suspended boolean) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or not public.is_admin() then raise exception 'Administrator only';end if;
update public.companies set suspended=p_suspended where id=p_company_id;if not found then raise exception 'Company not found';end if;
insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),case when p_suspended then 'Company suspended' else 'Company restored' end,p_company_id);end$$;
create or replace function public.review_provider(p_company_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or not public.is_admin() then raise exception 'Administrator only';end if;
if p_status not in ('verified','rejected','pending') then raise exception 'Invalid status';end if;
if not exists(select 1 from public.verification_requests where company_id=p_company_id) then raise exception 'No verification request';end if;
update public.companies set verification_status=p_status where id=p_company_id;
update public.verification_requests set reviewed_at=case when p_status='pending' then null else now() end where company_id=p_company_id;
insert into public.notifications(user_id,title,body) select owner_id,'Verification update','Your provider verification status is now '||p_status from public.companies where id=p_company_id;
insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),'Provider review: '||p_status,p_company_id);end$$;
drop policy if exists "verification requests self submit" on public.verification_requests;
create policy "verification requests self submit" on public.verification_requests for insert to authenticated with check(submitted_by=(select auth.uid()) and reviewed_at is null and exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()) and c.role in ('agent','trucker') and not c.suspended));
-- Limit updates to fields the client is permitted to change.
revoke update on public.verification_requests from authenticated;
grant update(registration_number,contact_email,contact_phone,document_links,details) on public.verification_requests to authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name) on public.profiles to authenticated;
-- Lock down trigger entry points; triggers still run as table owner.
revoke all on function public.notify_award(),public.notify_bid_created(),public.notify_message() from public,anon,authenticated;
-- Explicitly expose only authenticated, guarded workflow functions.
revoke all on function public.save_rfq(uuid,text,jsonb,text,boolean),public.update_company_profile(uuid,text,text,text,text[]),public.update_shipment(uuid,text,text),public.moderate_company(uuid,boolean) from public,anon;
grant execute on function public.save_rfq(uuid,text,jsonb,text,boolean),public.update_company_profile(uuid,text,text,text,text[]),public.update_shipment(uuid,text,text),public.moderate_company(uuid,boolean) to authenticated;
create index if not exists rfqs_owner_created_idx on public.rfqs(owner_id,created_at desc);
create index if not exists rfqs_status_created_idx on public.rfqs(status,created_at desc);
create index if not exists bids_rfq_idx on public.bids(rfq_id);
create index if not exists bids_provider_idx on public.bids(provider_id);
create index if not exists messages_rfq_created_idx on public.messages(rfq_id,created_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index if not exists shipment_events_rfq_idx on public.shipment_events(rfq_id,created_at);
-- Private verification uploads. Storage paths begin with the submitting user ID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('verification-documents','verification-documents',false,5242880,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy "verification files owner upload" on storage.objects for insert to authenticated with check(bucket_id='verification-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.companies where owner_id=(select auth.uid()) and role in ('agent','trucker') and not suspended));
create policy "verification files owner admin read" on storage.objects for select to authenticated using(bucket_id='verification-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));
-- Persistent rate limits apply across all API instances. No model key is sent to the browser.
create table public.inquiry_assistant_usage(user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null default now(),requests integer not null default 0);
alter table public.inquiry_assistant_usage enable row level security;
create or replace function public.claim_inquiry_assistant_request() returns boolean language plpgsql security definer set search_path='' as $$declare allowed boolean;begin
if auth.uid() is null or exists(select 1 from public.companies where owner_id=auth.uid() and suspended) then return false;end if;
insert into public.inquiry_assistant_usage(user_id,window_start,requests) values(auth.uid(),now(),1) on conflict(user_id) do update set requests=case when inquiry_assistant_usage.window_start<now()-interval '1 hour' then 1 else inquiry_assistant_usage.requests+1 end,window_start=case when inquiry_assistant_usage.window_start<now()-interval '1 hour' then now() else inquiry_assistant_usage.window_start end where inquiry_assistant_usage.requests<10 or inquiry_assistant_usage.window_start<now()-interval '1 hour' returning true into allowed;
return coalesce(allowed,false);end$$;
revoke all on function public.claim_inquiry_assistant_request() from public,anon;
grant execute on function public.claim_inquiry_assistant_request() to authenticated;
-- Validate direct submissions too; the RPC and REST API share the same invariant.

-- Suspension also blocks messages and verification edits at the database boundary.
drop policy if exists "messages participants send" on public.messages;
create policy "messages participants send" on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and sender_id<>recipient_id and exists(select 1 from public.companies where owner_id=(select auth.uid()) and not suspended) and ((public.owns_rfq(rfq_id) and exists(select 1 from public.bids b where b.rfq_id=messages.rfq_id and b.provider_id=messages.recipient_id)) or (public.has_bid_on_rfq(rfq_id) and exists(select 1 from public.rfqs r where r.id=messages.rfq_id and r.owner_id=messages.recipient_id))));
drop policy if exists "verification requests owner edit" on public.verification_requests;
create policy "verification requests owner edit" on public.verification_requests for update to authenticated using(submitted_by=(select auth.uid()) and reviewed_at is null and exists(select 1 from public.companies where id=company_id and owner_id=(select auth.uid()) and not suspended)) with check(submitted_by=(select auth.uid()) and reviewed_at is null and exists(select 1 from public.companies where id=company_id and owner_id=(select auth.uid()) and not suspended));
-- The usage ledger has no direct client policies; only the guarded rate-limit RPC writes it.
revoke all on public.inquiry_assistant_usage from anon,authenticated;
revoke all on function public.validate_marketplace_insert() from public,anon,authenticated;
-- Verification submissions must contain usable business contact details.
alter table public.verification_requests add constraint verification_registration_length check(length(trim(registration_number)) between 2 and 150);
alter table public.verification_requests add constraint verification_contact_email check(length(contact_email)<=254 and position('@' in contact_email)>1);
alter table public.verification_requests add constraint verification_contact_phone check(length(trim(contact_phone)) between 3 and 40);
alter table public.verification_requests add constraint verification_text_length check(length(document_links)<=4000 and length(details)<=4000);
