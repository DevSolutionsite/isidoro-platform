-- Falta en 20260805190000_site_content.sql: RLS define QUIÉN puede
-- pero no reemplaza el GRANT de qué OPERACIONES tiene el rol sobre la tabla.
-- Mismo bug que 20260625000001_fix_grants_and_rls.sql, esta vez sobre site_content.

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT UPDATE ON public.site_content TO authenticated;
