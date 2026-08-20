-- ============================================================
-- FIX: deletePromotion/deleteTimeOffer usaban `is_active = false`
-- para "eliminar" — pero is_active es el toggle de visibilidad
-- pública (mismo patrón que products.is_available, ver comentario
-- en 20260810180000_categories_is_active.sql), no borrado. Resultado:
-- el admin marcaba is_active=false pero el listado de /admin no
-- filtra por is_active (a propósito — necesita seguir mostrando
-- promociones vencidas / ofertas fuera de horario para historial y
-- reactivación), así que la fila seguía apareciendo "sin cambios".
--
-- Fix: columna `deleted_at` propia, mismo patrón ya usado en
-- `categories`/`products` (ver 20260615000000_initial_schema.sql).
-- is_active sigue siendo el toggle de vigencia/visibilidad; deleted_at
-- es el borrado real, que sí saca la fila de todos lados, incluido
-- el admin.
-- ============================================================

alter table public.promotions
  add column deleted_at timestamptz;

alter table public.time_offers
  add column deleted_at timestamptz;

drop policy if exists "promotions: lectura pública" on public.promotions;

create policy "promotions: lectura pública" on public.promotions
  for select using (deleted_at is null);

drop policy if exists "time_offers: lectura pública" on public.time_offers;

create policy "time_offers: lectura pública" on public.time_offers
  for select using (deleted_at is null);
