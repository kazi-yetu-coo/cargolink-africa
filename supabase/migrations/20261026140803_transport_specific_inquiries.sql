-- Validate mode-specific inquiry fields without changing or deleting historical records.
-- Clearance remains an itemised quotation charge, not a standalone new inquiry type.
create or replace function public.validate_transport_inquiry() returns trigger
language plpgsql security invoker set search_path='' as $$
declare scope text;equipment text;qty numeric;packages numeric;weight numeric;
begin
 if new.status not in ('draft','open') then return new; end if;
 if new.service='Customs Clearance' then raise exception 'Choose a freight service. Clearing agents include clearance fees in their quotation breakdown.';end if;
 if new.status='draft' then return new;end if;
 scope:=coalesce(new.details->>'scope','');
 if scope='' then raise exception 'Select a service scope';end if;
 if new.service<>'Warehousing' then
  if scope like 'Door%' and coalesce(length(trim(new.details->>'pickupAddress')),0)=0 then raise exception 'A full pickup address is required for door service';end if;
  if scope like '%door' and coalesce(length(trim(new.details->>'deliveryAddress')),0)=0 then raise exception 'A full delivery address is required for door service';end if;
 end if;
 if coalesce(length(new.details->>'pickupAddress'),0)>500 or coalesce(length(new.details->>'deliveryAddress'),0)>500 then raise exception 'Addresses must be 500 characters or fewer';end if;
 weight:=coalesce((new.details->>'weight')::numeric,0);
 if not(weight>0 and weight<1000000000000) then raise exception 'Enter a finite positive gross weight';end if;
 if new.service='Ocean Freight' then
  if new.details#>>'{origin,type}' is distinct from 'Port' or new.details#>>'{destination,type}' is distinct from 'Port' then raise exception 'Choose origin and destination ports for sea freight';end if;
  equipment:=trim(coalesce(new.details->>'containers',''));
  if equipment='' or equipment in ('Not required','Select equipment') then raise exception 'Sea shipment equipment is required';end if;
  if equipment not in ('LCL','LCL / loose cargo','Breakbulk / non-containerised') then
   qty:=coalesce((new.details->>'quantity')::numeric,0);
   if not(qty>=1 and qty<=1000000 and qty=trunc(qty)) then raise exception 'Enter a positive whole number of containers';end if;
  end if;
 end if;
 if new.service='Air Freight' then
  if new.details#>>'{origin,type}' is distinct from 'Airport' or new.details#>>'{destination,type}' is distinct from 'Airport' then raise exception 'Choose origin and destination airports for air freight';end if;
  if coalesce(new.details->>'containers','')<>'' then raise exception 'Air freight uses boxes/packages and weight rather than sea equipment';end if;
  packages:=coalesce((new.details->>'packageCount')::numeric,0);
  if not(packages>=1 and packages<=100000000 and packages=trunc(packages)) then raise exception 'Enter a positive whole number of air boxes/packages';end if;
 end if;
 if new.details ? 'packageCount' then
  packages:=(new.details->>'packageCount')::numeric;
  if not(packages>=1 and packages<=100000000 and packages=trunc(packages)) then raise exception 'Package count must be a positive whole number';end if;
 end if;
 return new;
end$$;
create trigger validate_transport_inquiry_trigger before insert or update of details,service,status on public.rfqs for each row execute function public.validate_transport_inquiry();
revoke all on function public.validate_transport_inquiry() from public,anon,authenticated;
