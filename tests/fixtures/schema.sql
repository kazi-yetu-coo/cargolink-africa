-- Minimal test-only reconstruction of the existing public schema inspected 2026-10-26.
-- These fixtures never run against the connected production database.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table public.companies(id uuid primary key default gen_random_uuid(), owner_id uuid not null, name text not null, role text not null check(role in ('shipper','agent','trucker')), verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')), created_at timestamptz default now());
create table public.company_members(company_id uuid references public.companies(id), user_id uuid, role text default 'owner', primary key(company_id,user_id));
create table public.platform_admins(user_id uuid primary key);
create table public.rfqs(id uuid primary key default gen_random_uuid(),owner_id uuid not null,company_id uuid references public.companies(id),service text not null check(service in ('Ocean Freight','Air Freight','Trucking','Warehousing')),details jsonb not null default '{}',notes text default '',status text not null default 'open' check(status in ('draft','open','awarded','closed')),awarded_bid_id uuid,created_at timestamptz default now());
create table public.bids(id uuid primary key default gen_random_uuid(),rfq_id uuid not null references public.rfqs(id),provider_id uuid not null,company_id uuid not null references public.companies(id),currency text not null check(currency in ('USD','TZS','KES','NGN','UGX','RWF')),amount numeric not null check(amount>0),transit_days integer not null check(transit_days>0),notes text default '',status text default 'submitted',created_at timestamptz default now(),unique(rfq_id,company_id));
alter table public.rfqs add foreign key(awarded_bid_id) references public.bids(id);
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.rfqs enable row level security;
alter table public.bids enable row level security;
alter table public.platform_admins enable row level security;
grant select,insert,update on all tables in schema public to authenticated;
