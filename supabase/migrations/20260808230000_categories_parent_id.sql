-- Subcategorías (pedido del cliente en la reunión del 8 de agosto de 2026,
-- ver DEC-036 punto 1). Diseño: opción A — auto-referencia en `categories`,
-- sin tabla nueva. Aprobado por Fran/CTO Agent antes de escribir esto.
--
-- Una subcategoría es una fila de `categories` con `parent_category_id`
-- apuntando a otra fila de `categories` (ej: "Gaseosas" con
-- parent_category_id = id de "Bebidas"). `products.category_id` no cambia
-- de significado ni de tipo: sigue apuntando a la fila "hoja" que el
-- producto usa — la subcategoría si el producto pertenece a una, o la
-- categoría de nivel superior si no. No hace falta tocar `products` en
-- esta migración.
--
-- Asunción de diseño: 2 niveles fijos (categoría -> subcategoría), no N
-- niveles arbitrarios — así lo pidió el cliente y así lo va a consumir el
-- frontend (el selector de "categoría padre" en el admin solo va a listar
-- categorías con parent_category_id is null). El constraint de abajo
-- únicamente evita que una fila sea padre de sí misma; no hay trigger que
-- impida un tercer nivel (subcategoría de subcategoría) a nivel de DB —
-- queda garantizado por el frontend, ver DEC-039 en DECISIONS.md.

alter table public.categories
  add column parent_category_id uuid references public.categories(id);

alter table public.categories
  add constraint categories_parent_not_self check (id <> parent_category_id);

create index idx_categories_parent on public.categories (parent_category_id);

-- RLS: no hace falta ninguna policy nueva. Las policies existentes de
-- `categories` ("lectura pública" / "escritura solo admin") aplican a la
-- fila completa, columna nueva incluida — ya cubren parent_category_id.
