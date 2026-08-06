-- ============================================================
-- FIX HALLAZGO B (auditoría de seguridad — sistema de puntos)
--
-- Problema: la policy "redemptions: cajero y admin ven y
-- modifican todas" era FOR ALL USING (...) sin WITH CHECK
-- separado. En Postgres, si una policy FOR ALL no define
-- WITH CHECK explícito, reusa la expresión de USING también
-- para INSERT/UPDATE. Sumado al GRANT INSERT, UPDATE que
-- 20260625000001_fix_grants_and_rls.sql le dio a `authenticated`
-- sobre esta tabla, cualquier sesión cajero/admin podía hacer
-- UPDATE redemptions SET status='confirmed' directo por REST,
-- saltándose por completo confirm_redemption(): sin descuento
-- FIFO de points_transactions, sin decremento de points_balance,
-- sin chequeo de stock ni de expiración.
--
-- Fix: separar la policy en SELECT únicamente (se mantiene el
-- acceso de lectura que ya existía) y no dejar ninguna policy
-- de INSERT/UPDATE — con RLS activo, la ausencia de policy para
-- un comando es deny-by-default para todos los roles. Las únicas
-- vías de escritura que quedan son:
--   - confirm_redemption(): SECURITY DEFINER, corre como el
--     dueño de la función (postgres), no como el caller, así
--     que RLS no lo afecta.
--   - initiate-redemption (Edge Function): inserta con el
--     cliente service_role, que tiene bypassrls y privilegios
--     de tabla propios desde el aprovisionamiento del proyecto,
--     independientes del GRANT que tenía `authenticated`.
-- ============================================================

drop policy if exists "redemptions: cajero y admin ven y modifican todas" on public.redemptions;

create policy "redemptions: cajero y admin ven todas" on public.redemptions
  for select using (
    public.current_user_role() in ('cajero', 'admin')
  );

-- Sin policy de INSERT/UPDATE/DELETE para ningún rol de REST:
-- toda escritura queda bloqueada por RLS salvo vía confirm_redemption()
-- o el cliente service_role de initiate-redemption.

revoke insert, update on public.redemptions from authenticated;
