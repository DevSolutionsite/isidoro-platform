-- ============================================================
-- FIX: cierre en tiempo real de CodigoCanjeCard dejó de recibir
-- el evento de UPDATE cuando confirm_redemption() confirma un
-- canje, aunque el canal quedaba en SUBSCRIBED (diagnóstico:
-- pruebas controladas con service_role mostraron el pipeline
-- de Realtime funcionando en general, pero con REPLICA IDENTITY
-- default (solo PK) — la policy de RLS que Realtime necesita
-- evaluar para autorizar la entrega a un cliente autenticado usa
-- `client_id`, que no es la primary key, y por eso Realtime no
-- siempre tiene esa columna disponible para autorizar el evento
-- por el camino RLS-real (a diferencia de service_role, que
-- bypasea RLS por completo y sí recibía los eventos en las
-- pruebas).
--
-- REPLICA IDENTITY FULL hace que cada fila del WAL incluya todas
-- las columnas (no solo la PK), así Realtime tiene `client_id`
-- disponible para evaluar la policy en cualquier evento.
-- ============================================================

alter table public.redemptions replica identity full;
