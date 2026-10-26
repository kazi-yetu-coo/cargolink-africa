create or replace function public.save_rfq(p_id uuid,p_service text,p_details jsonb,p_notes text,p_submit boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare cid uuid;rid uuid;begin
select id into cid from public.companies where id=public.active_company_id() and owner_id=auth.uid() and role='shipper' and not suspended limit 1;
if cid is null then raise exception 'An active cargo owner account is required';end if;
if p_service not in ('Ocean Freight','Air Freight','Trucking','Rail Freight','Multimodal','Customs Clearance','Warehousing') or jsonb_typeof(p_details)<>'object' or length(p_details::text)>20000 or length(p_notes)>4000 then raise exception 'Invalid shipment details';end if;
if p_submit then
if coalesce(p_details#>>'{origin,name}','')='' or (p_service<>'Warehousing' and coalesce(p_details#>>'{destination,name}','')='') or coalesce(trim(p_details->>'cargo'),'')='' or coalesce((p_details->>'weight')::numeric,0)<=0 or coalesce((p_details->>'date')::date,'1900-01-01')<current_date then raise exception 'Origin, destination, cargo, positive weight and a future ready date are required';end if;
if p_details->'origin'=p_details->'destination' and p_service<>'Warehousing' then raise exception 'Origin and destination must differ';end if;
if coalesce((p_details->>'volume')::numeric,0)<0 or (p_details->>'deliveryDate')::date<(p_details->>'date')::date then raise exception 'Invalid volume or delivery date';end if;
end if;
if p_id is null then insert into public.rfqs(owner_id,company_id,service,details,notes,status) values(auth.uid(),cid,p_service,p_details,p_notes,case when p_submit then 'open' else 'draft' end) returning id into rid;
else update public.rfqs set service=p_service,details=p_details,notes=p_notes,status=case when p_submit then 'open' else 'draft' end where id=p_id and owner_id=auth.uid() and company_id=cid and status='draft' returning id into rid;if rid is null then raise exception 'Only your own draft inquiries can be edited';end if;end if;
insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),case when p_submit then 'Inquiry submitted' else 'Draft saved' end,rid);return rid;end$$;

create or replace function public.award_bid(p_rfq_id uuid,p_bid_id uuid) returns void language plpgsql security definer set search_path='' as $$declare r public.rfqs%rowtype;b public.bids%rowtype;begin
select * into r from public.rfqs where id=p_rfq_id for update;
if auth.uid() is null or r.owner_id is distinct from auth.uid() or r.status<>'open' or (r.review_owner_id is not null and r.company_id is distinct from public.active_company_id()) or exists(select 1 from public.companies where id=r.company_id and suspended) then raise exception 'Not authorized or inquiry is not open';end if;
select * into b from public.bids where id=p_bid_id and rfq_id=p_rfq_id and status='submitted';
if not found or (b.valid_until is not null and b.valid_until<current_date) or not exists(select 1 from public.companies where id=b.company_id and verification_status='verified' and not suspended) then raise exception 'Quotation is expired, invalid or from an unverified provider';end if;
update public.rfqs set status='awarded',awarded_bid_id=b.id where id=r.id;
update public.bids set status=case when id=b.id then 'awarded' else 'not_selected' end where rfq_id=r.id;
insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),'Quotation awarded',r.id);end$$;

create or replace function public.update_shipment(p_rfq_id uuid,p_milestone text,p_note text default '') returns void language plpgsql security definer set search_path='' as $$declare r public.rfqs%rowtype;begin
select * into r from public.rfqs where id=p_rfq_id for update;
if auth.uid() is null or r.status<>'awarded' or not exists(select 1 from public.bids b join public.companies c on c.id=b.company_id where b.id=r.awarded_bid_id and b.provider_id=auth.uid() and b.company_id=public.active_company_id() and not c.suspended) then raise exception 'Only the awarded provider can update this shipment';end if;
if p_milestone not in ('Awaiting pickup','Picked up','In transit','At customs','Out for delivery','Delivered') or length(p_note)>1000 then raise exception 'Invalid milestone';end if;
update public.rfqs set progress=p_milestone,status=case when p_milestone='Delivered' then 'completed' else status end where id=r.id;
insert into public.shipment_events(rfq_id,actor_id,milestone,note) values(r.id,auth.uid(),p_milestone,p_note);
insert into public.notifications(user_id,rfq_id,title,body) values(r.owner_id,r.id,'Shipment status update',p_milestone||case when p_note<>'' then ': '||p_note else '' end);end$$;

-- Even direct REST inserts must use the active company selected by the guarded RPC.
create or replace function public.guard_active_review_company() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.company_id is distinct from public.active_company_id() then raise exception 'Use your active company workspace';end if;return new;end$$;
create trigger guard_active_rfq_company before insert on public.rfqs for each row execute function public.guard_active_review_company();
revoke all on function public.guard_active_review_company() from public,anon,authenticated;

create policy "public verified companies" on public.companies for select to anon using(review_owner_id is null and verification_status='verified' and not suspended);
grant select on public.companies to anon;
create or replace function public.mark_review_activity() returns trigger language plpgsql security invoker set search_path='' as $$declare review_uid uuid;begin
 select review_owner_id into review_uid from public.rfqs where id=new.record_id;
 if review_uid is null then select review_owner_id into review_uid from public.companies where id=new.record_id;end if;
 if review_uid is not null and new.action not like 'Admin review%' then new.action:='Admin review: '||new.action;end if;
 return new;
end$$;
create trigger label_review_activity before insert on public.marketplace_activity for each row execute function public.mark_review_activity();
revoke all on function public.mark_review_activity() from public,anon,authenticated;
create index companies_review_owner_idx on public.companies(review_owner_id);
create index notifications_review_owner_idx on public.notifications(review_owner_id);
