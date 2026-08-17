-- ============================================================
-- FIX CRÍTICO C1 (auditoría de seguridad — 17 ago 2026)
--
-- Problema: la policy "profiles: usuario actualiza el suyo" no tenía
-- WITH CHECK explícito. En Postgres, cuando una policy FOR UPDATE
-- omite WITH CHECK, reutiliza la expresión de USING también para
-- validar la fila resultante. Como USING solo exige auth.uid() = id
-- (condición que sigue siendo verdadera después de cambiar cualquier
-- otra columna, incluido `role`), y el GRANT UPDATE a `authenticated`
-- cubre la fila completa sin lista de columnas, cualquier usuario
-- autenticado podía ejecutar:
--
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', uid)
--
-- y auto-otorgarse rol admin o cajero directo por REST, sin pasar
-- por updateUserRole() ni por ningún Server Action.
--
-- Fix: WITH CHECK que exige que `role` en la fila resultante sea
-- igual al `role` actual del caller, leído vía current_user_role()
-- (la misma función SECURITY DEFINER que ya usa el resto de las
-- policies de este proyecto para evitar recursión de RLS sobre
-- profiles — ver 20260625000001_fix_grants_and_rls.sql). El usuario
-- sigue pudiendo editar full_name, phone, dni, city, email_opt_out,
-- etc. — cualquier columna salvo `role` — pero cualquier UPDATE que
-- intente cambiar `role` queda rechazado por RLS antes de tocar la
-- fila.
--
-- El único camino que sigue habilitado para cambiar `role` es la
-- policy "profiles: admin actualiza cualquiera" (ya exige
-- role = 'admin' del caller vía su propia fila), usada por
-- updateUserRole() en admin-users.ts. Esa policy no se toca.
-- ============================================================

drop policy if exists "profiles: usuario actualiza el suyo" on public.profiles;

create policy "profiles: usuario actualiza el suyo" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = public.current_user_role()
  );
