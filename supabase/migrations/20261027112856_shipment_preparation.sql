-- User-owned preparation progress and consent. No email is sent by this migration.
create table public.shipment_preparation (
 rfq_id uuid primary key references public.rfqs(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 completed text[] not null default '{}',
 email_requested boolean not null default false,
 updated_at timestamptz not null default now(),
 check(cardinality(completed)<=20)
);
alter table public.shipment_preparation enable row level security;
grant select on public.shipment_preparation to authenticated;
create policy "preparation owner read" on public.shipment_preparation for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.rfqs r where r.id=rfq_id and r.owner_id=(select auth.uid()) and r.company_id=public.active_company_id()));
create index shipment_preparation_user_idx on public.shipment_preparation(user_id);
create or replace function public.save_shipment_preparation(p_rfq uuid,p_completed text[],p_email_requested boolean) returns void
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not exists(select 1 from public.rfqs r where r.id=p_rfq and r.owner_id=auth.uid() and r.company_id=public.active_company_id() and r.status<>'draft') then raise exception 'Only the owner can prepare this submitted inquiry';end if;
 if p_completed is null or cardinality(p_completed)>20 or length(p_completed::text)>1000 or p_email_requested is null then raise exception 'Invalid preparation preferences';end if;
 insert into public.shipment_preparation(rfq_id,user_id,completed,email_requested) values(p_rfq,auth.uid(),p_completed,p_email_requested)
 on conflict(rfq_id) do update set completed=excluded.completed,email_requested=excluded.email_requested,updated_at=now();
end$$;
revoke all on function public.save_shipment_preparation(uuid,text[],boolean) from public,anon;
grant execute on function public.save_shipment_preparation(uuid,text[],boolean) to authenticated;
