CREATE OR REPLACE FUNCTION public.has_bid_on_rfq(rid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select exists(select 1 from public.bids b where b.rfq_id=rid and b.provider_id=(select auth.uid()))$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select exists(select 1 from public.platform_admins a where a.user_id=(select auth.uid()))$function$;

CREATE OR REPLACE FUNCTION public.is_company_member(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select exists(select 1 from public.company_members m where m.company_id=cid and m.user_id=(select auth.uid()))$function$;

CREATE OR REPLACE FUNCTION public.is_verified_provider(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select exists(select 1 from public.companies c join public.company_members m on m.company_id=c.id where c.id=cid and c.verification_status='verified' and c.role in ('agent','trucker') and m.user_id=(select auth.uid()))$function$;

CREATE OR REPLACE FUNCTION public.owns_rfq(rid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select exists(select 1 from public.rfqs r where r.id=rid and r.owner_id=(select auth.uid()))$function$;

CREATE OR REPLACE FUNCTION public.register_company(p_name text, p_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare cid uuid;begin if (select auth.uid()) is null then raise exception 'Sign in required';end if;if length(trim(p_name))<2 or p_role not in ('shipper','agent','trucker') then raise exception 'Invalid company details';end if;insert into public.companies(owner_id,name,role) values((select auth.uid()),trim(p_name),p_role) returning id into cid;insert into public.company_members(company_id,user_id,role) values(cid,(select auth.uid()),'owner');return cid;end$function$;

