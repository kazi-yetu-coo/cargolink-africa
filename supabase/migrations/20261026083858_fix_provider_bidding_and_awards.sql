-- Targeted correction for the existing CargoLink schema. No tables or data are replaced.
-- Apply during release, before publishing the UI. The owner check remains in the RPC.
begin;

drop policy if exists "bids create" on public.bids;
create policy "bids create" on public.bids
for insert to authenticated
with check (
  provider_id = (select auth.uid())
  and status = 'submitted'
  and public.is_verified_provider(company_id)
  and exists (
    select 1 from public.rfqs r
    join public.companies c on c.id = bids.company_id
    where r.id = bids.rfq_id
      and r.status = 'open'
      and r.owner_id <> (select auth.uid())
      and c.owner_id <> r.owner_id
      and not public.is_company_member(r.company_id)
      and c.role = case when r.service = 'Trucking' then 'trucker' else 'agent' end
  )
);

-- Preserve the existing privileged RPC because normal users cannot update RFQs or bids
-- directly. Its authentication, ownership, provider and state checks are explicit.
create or replace function public.award_bid(p_rfq_id uuid, p_bid_id uuid)
returns void language plpgsql security definer set search_path = ''
as $function$
declare
  request public.rfqs%rowtype;
  bid public.bids%rowtype;
  provider public.companies%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
  select * into request from public.rfqs where id = p_rfq_id for update;
  if not found or request.owner_id <> (select auth.uid()) or request.status <> 'open' then
    raise exception 'Not permitted or RFQ is not open';
  end if;
  select * into bid from public.bids where id = p_bid_id and rfq_id = p_rfq_id for update;
  if not found or bid.status <> 'submitted' or bid.provider_id = request.owner_id then
    raise exception 'Invalid bid';
  end if;
  select * into provider from public.companies where id = bid.company_id for share;
  -- is_verified_provider() checks the CURRENT user, so it cannot validate another
  -- company's bid while the cargo owner is awarding it.
  if not found or provider.verification_status <> 'verified'
    or provider.owner_id = request.owner_id
    or provider.role <> (case when request.service = 'Trucking' then 'trucker' else 'agent' end)
    or not exists (select 1 from public.company_members m where m.company_id = bid.company_id and m.user_id = bid.provider_id)
    or exists (select 1 from public.company_members m where m.company_id = request.company_id and m.user_id = bid.provider_id)
  then raise exception 'Invalid or unverified provider'; end if;
  update public.rfqs set status = 'awarded', awarded_bid_id = p_bid_id where id = p_rfq_id;
  update public.bids set status = 'awarded' where id = p_bid_id;
end
$function$;

-- Anonymous callers do not need the mutation endpoints. Keep authenticated access.
revoke execute on function public.award_bid(uuid, uuid) from public, anon;
grant execute on function public.award_bid(uuid, uuid) to authenticated;
revoke execute on function public.register_company(text, text) from public, anon;
grant execute on function public.register_company(text, text) to authenticated;
commit;
