-- ============================================================
-- Habilita Realtime (postgres_changes) sobre redemptions.
-- El cliente en /perfil se suscribe al UPDATE de su propia fila
-- para cerrar CodigoCanjeCard en el momento en que el cajero
-- confirma o el código expira, sin depender de un timer fijo.
--
-- Chequea pg_publication_tables antes de alterar: evita el error
-- "already member of publication" si alguna vez se habilitó a
-- mano desde el Dashboard (ya pasó una vez en este proyecto con
-- el grant de current_user_role(), ver 20260727020316).
--
-- No requiere REPLICA IDENTITY FULL: solo filtramos por `id`
-- (PK, inmutable) y leemos el NEW.status, que el replica identity
-- default ya incluye.
--
-- RLS sin cambios: Realtime respeta la policy existente
-- "redemptions: cliente ve las suyas" (auth.uid() = client_id),
-- así que cada cliente solo recibe eventos de sus propias filas.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname    = 'supabase_realtime'
      and schemaname  = 'public'
      and tablename   = 'redemptions'
  ) then
    alter publication supabase_realtime add table public.redemptions;
  end if;
end $$;
