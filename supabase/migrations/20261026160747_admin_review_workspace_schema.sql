-- Administrator-owned review workspaces; no impersonation and no public test listings.
alter table public.companies add column review_owner_id uuid references auth.users(id);
alter table public.rfqs add column review_owner_id uuid references auth.users(id);
alter table public.bids add column review_owner_id uuid references auth.users(id);
alter table public.notifications add column review_owner_id uuid references auth.users(id);
create table public.admin_review_workspaces(user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('customer','cfa','trucker')),company_id uuid not null unique references public.companies(id),primary key(user_id,kind));
create table public.admin_workspace_preferences(user_id uuid primary key references auth.users(id) on delete cascade,workspace text not null default 'admin' check(workspace in ('admin','customer','cfa','trucker')));
alter table public.admin_review_workspaces enable row level security;
alter table public.admin_workspace_preferences enable row level security;
create policy "own admin review mappings" on public.admin_review_workspaces for select to authenticated using(user_id=(select auth.uid()) and public.is_admin());
create policy "own admin workspace preference" on public.admin_workspace_preferences for select to authenticated using(user_id=(select auth.uid()) and public.is_admin());
grant select on public.admin_review_workspaces,public.admin_workspace_preferences to authenticated;
revoke insert,update,delete on public.admin_review_workspaces,public.admin_workspace_preferences from anon,authenticated;
