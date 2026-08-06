-- ============================================================
-- FIX HALLAZGO C (auditoría de seguridad — sistema de puntos)
--
-- redemptions.code no tenía ningún constraint de unicidad — solo
-- el check de formato (6 dígitos). Con espacio de 1.000.000 de
-- códigos y varios canjes 'pending' simultáneos posibles dentro
-- de la ventana de 15 min, existe la paradoja del cumpleaños: dos
-- clientes distintos podían terminar con el mismo código activo
-- al mismo tiempo. confirm_redemption() hace
--   select ... where code = p_code and status = 'pending'
-- sin ORDER BY/LIMIT — ante una colisión, toma una fila arbitraria
-- de las que matchean, pudiendo confirmar y descontar puntos del
-- cliente equivocado.
--
-- Fix: unique index parcial sobre code, acotado a status='pending'.
-- Parcial (no sobre toda la tabla) porque códigos ya confirmados o
-- expirados sí pueden repetirse con el tiempo — solo importa que
-- no haya dos PENDING con el mismo código a la vez. Esto convierte
-- la colisión de "confirmación silenciosa del cliente equivocado"
-- a un error de INSERT explícito en initiate-redemption, que el
-- código de la Edge Function puede reintentar con un código nuevo.
-- ============================================================

create unique index if not exists redemptions_code_pending_unique
  on public.redemptions (code)
  where status = 'pending';
