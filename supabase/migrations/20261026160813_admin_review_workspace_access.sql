create or replace function public.active_company_id() returns uuid language sql stable security definer set search_path='' as $$
 select coalesce((select w.company_id from public.admin_review_workspaces w join public.admin_workspace_preferences p on p.user_id=w.user_id and p.workspace=w.kind where w.user_id=auth.uid() and public.is_admin()),(select c.id from public.companies c where c.owner_id=auth.uid() and c.review_owner_id is null order by c.created_at limit 1))
$$;
create or replace function public.review_record_visible(review_uid uuid) returns boolean language plpgsql stable security invoker set search_path='' as $$begin if review_uid is null then return true;end if;if auth.uid() is null then return false;end if;return review_uid=auth.uid() and public.is_admin();end$$;
create or replace function public.get_workspace_context() returns jsonb language plpgsql security invoker set search_path='' as $$declare admin_flag boolean;workspace_kind text;company_record jsonb;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 admin_flag:=public.is_admin();
 if admin_flag then select workspace into workspace_kind from public.admin_workspace_preferences where user_id=auth.uid();workspace_kind:=coalesce(workspace_kind,'admin');end if;
 select to_jsonb(c) into company_record from public.companies c where c.id=public.active_company_id();
 return jsonb_build_object('is_admin',admin_flag,'workspace',workspace_kind,'company',company_record,'role',case when admin_flag and workspace_kind='admin' then 'admin' when company_record->>'role'='shipper' then 'customer' else 'provider' end);
end$$;
create or replace function public.switch_admin_workspace(p_workspace text) returns jsonb language plpgsql security definer set search_path='' as $$declare cid uuid;company_role text;company_label text;begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator only';end if;
 if p_workspace not in ('admin','customer','cfa','trucker') or p_workspace is null then raise exception 'Invalid workspace';end if;
 perform pg_advisory_xact_lock(hashtext('admin-review:'||auth.uid()::text));
 if p_workspace<>'admin' then
  select company_id into cid from public.admin_review_workspaces where user_id=auth.uid() and kind=p_workspace;
  if cid is null then
   company_role:=case p_workspace when 'customer' then 'shipper' when 'cfa' then 'agent' else 'trucker' end;
   company_label:=case p_workspace when 'customer' then 'Cargo Owner' when 'cfa' then 'CFA' else 'Truck Owner' end;
   insert into public.companies(owner_id,name,role,verification_status,review_owner_id) values(auth.uid(),'Admin Review — '||company_label,company_role,case when company_role='shipper' then 'pending' else 'verified' end,auth.uid()) returning id into cid;
   insert into public.company_members(company_id,user_id,role) values(cid,auth.uid(),'owner');
   insert into public.admin_review_workspaces(user_id,kind,company_id) values(auth.uid(),p_workspace,cid);
  end if;
 end if;
 insert into public.admin_workspace_preferences(user_id,workspace) values(auth.uid(),p_workspace) on conflict(user_id) do update set workspace=excluded.workspace;
 insert into public.marketplace_activity(actor_id,action,record_id) values(auth.uid(),'Admin review workspace: '||p_workspace,cid);
 return public.get_workspace_context();
end$$;
create or replace function public.mark_review_record() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_table_name='notifications' then select review_owner_id into new.review_owner_id from public.rfqs where id=new.rfq_id;
 else select review_owner_id into new.review_owner_id from public.companies where id=new.company_id;end if;
 if tg_table_name='notifications' and new.review_owner_id is not null then new.title:='Review: '||new.title;end if;
 return new;
end$$;
create trigger derive_rfq_review_owner before insert on public.rfqs for each row execute function public.mark_review_record();
create trigger derive_bid_review_owner before insert on public.bids for each row execute function public.mark_review_record();
create trigger derive_notification_review_owner before insert on public.notifications for each row execute function public.mark_review_record();
-- Keep review ownership immutable through direct client updates.
revoke update(review_owner_id) on public.companies,public.rfqs,public.bids,public.notifications from authenticated;
drop policy if exists "companies read" on public.companies;
create policy "companies read" on public.companies for select to authenticated using(public.review_record_visible(review_owner_id) and (owner_id=(select auth.uid()) or public.is_company_member(id) or verification_status='verified' or public.is_admin()));
drop policy if exists "rfqs read" on public.rfqs;
create policy "rfqs read" on public.rfqs for select to authenticated using(public.review_record_visible(review_owner_id) and (owner_id=(select auth.uid()) or public.is_admin() or public.has_bid_on_rfq(id) or (status='open' and exists(select 1 from public.companies c where c.id=public.active_company_id() and c.role in ('agent','trucker') and not c.suspended and (c.role='agent' or service in ('Trucking','Multimodal'))))));
drop policy if exists "bids read" on public.bids;
create policy "bids read" on public.bids for select to authenticated using(public.review_record_visible(review_owner_id) and (provider_id=(select auth.uid()) or public.owns_rfq(rfq_id) or public.is_admin()));
drop policy if exists "bids create" on public.bids;
create policy "bids create" on public.bids for insert to authenticated with check(provider_id=(select auth.uid()) and company_id=public.active_company_id() and public.is_verified_provider(company_id) and exists(select 1 from public.rfqs r join public.companies p on p.id=bids.company_id where r.id=rfq_id and r.status='open' and r.company_id<>bids.company_id and ((r.review_owner_id is null and p.review_owner_id is null and r.owner_id<>(select auth.uid())) or (public.is_admin() and r.review_owner_id=(select auth.uid()) and p.review_owner_id=(select auth.uid()))) and (p.role='agent' or (p.role='trucker' and r.service in ('Trucking','Multimodal')))));
revoke all on function public.active_company_id(),public.get_workspace_context(),public.switch_admin_workspace(text) from public,anon;
grant execute on function public.active_company_id(),public.get_workspace_context(),public.switch_admin_workspace(text) to authenticated;
revoke all on function public.mark_review_record() from public,anon,authenticated;
create index rfqs_review_owner_idx on public.rfqs(review_owner_id);
create index bids_review_owner_idx on public.bids(review_owner_id);

