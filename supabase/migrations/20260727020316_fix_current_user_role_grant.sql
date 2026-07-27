-- Regulariza fix aplicado manualmente en Supabase Dashboard (fuera de flujo DEC-016).
-- current_user_role() perdió EXECUTE para 'anon' en 20260715050753_fix_security_definer_grants.sql,
-- que asumía que 'anon' no la necesitaba por no tener grants sobre profiles.
-- Pero categories/products/rewards tienen policy FOR ALL que hace subquery a profiles,
-- lo cual dispara la policy RLS "cajero y admin ven todos" de profiles, que llama a
-- current_user_role() — de ahí el permission denied para anon al leer esas tablas.
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;
