-- Disponibilidad de delivery, gestionada en /admin/delivery (separado de
-- /admin/productos y /admin/categorias, pedido del cliente el 15 de agosto
-- de 2026). No se duplica ningún dato: mismo patrón que `is_active` /
-- `is_available` — un flag más sobre las filas existentes de `categories` y
-- `products`, no una tabla nueva.
--
-- Confirmado antes de escribir esto: ninguna de las dos tablas tiene
-- `available_for_delivery` en producción (verificado en vivo vía REST con
-- la service role key — la clave no aparece en ninguna fila de ninguna
-- tabla).
--
-- Regla de herencia (categoría padre desactivada → subcategorías y
-- productos quedan inelegibles sin tocar sus flags individuales; si se
-- reactiva el padre, todo vuelve salvo lo desactivado explícitamente en el
-- medio) se resuelve enteramente en el frontend al calcular elegibilidad —
-- no requiere ninguna columna ni trigger adicional acá, mismo criterio que
-- `categories.is_active` (ver 20260810180000).

alter table public.categories
  add column available_for_delivery boolean not null default true;

alter table public.products
  add column available_for_delivery boolean not null default true;

-- RLS: no hace falta ninguna policy nueva — las policies existentes de
-- `categories`/`products` ("lectura pública" / "escritura solo admin") ya
-- cubren cualquier columna de la fila, `available_for_delivery` incluida.
