-- Relevant production policies reproduced for local PostgreSQL regression tests.
create policy "companies read" on public.companies for select using(owner_id=auth.uid() or public.is_company_member(id) or verification_status='verified' or public.is_admin());
create policy "members read" on public.company_members for select using(user_id=auth.uid() or public.is_company_member(company_id) or public.is_admin());
create policy "rfqs read" on public.rfqs for select using(owner_id=auth.uid() or status='open' or public.has_bid_on_rfq(id));
create policy "rfqs create" on public.rfqs for insert with check(owner_id=auth.uid() and status in ('draft','open') and (company_id is null or public.is_company_member(company_id)));
create policy "bids read" on public.bids for select using(provider_id=auth.uid() or public.owns_rfq(rfq_id));
create policy "admins self" on public.platform_admins for select using(user_id=auth.uid());
