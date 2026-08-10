-- Activar/desactivar categorías y subcategorías (pedido del cliente en la
-- reunión del 8 de agosto de 2026, ver DEC-036 punto 5).
--
-- Mismo patrón que products.is_available / promotions.is_active /
-- time_offers.is_active: un toggle independiente de `deleted_at`. La
-- categoría sigue existiendo y siendo administrable (visible y editable en
-- /admin/categorias) cuando is_active = false, pero se oculta de /carta —
-- a diferencia de `deleted_at`, que la saca de todos lados, incluido el
-- admin. No hace falta ninguna columna nueva en `subcategories`: una
-- subcategoría es una fila más de `categories` (ver DEC-039), así que esta
-- misma columna cubre ambos casos sin cambios adicionales.

alter table public.categories
  add column is_active boolean not null default true;

-- RLS: no hace falta ninguna policy nueva — mismo motivo que
-- 20260808230000_categories_parent_id.sql, las policies existentes de
-- `categories` ("lectura pública" / "escritura solo admin") ya cubren
-- cualquier columna de la fila, is_active incluida.
