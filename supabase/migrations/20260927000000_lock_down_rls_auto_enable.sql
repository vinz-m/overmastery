-- public.rls_auto_enable() is created by Supabase (not this repo) for the event
-- trigger that turns on row-level security for new tables in public. Like any
-- function in public it is callable through the Data API by default, and it is
-- SECURITY DEFINER, which the Security Advisor flags for anon and authenticated.
--
-- Nothing should call it directly: Postgres invokes event trigger functions
-- itself and doesn't check EXECUTE for that, so revoking keeps auto-enable
-- working while removing API access. Guarded so environments without the
-- function (e.g. a fresh local database) still apply this migration.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
