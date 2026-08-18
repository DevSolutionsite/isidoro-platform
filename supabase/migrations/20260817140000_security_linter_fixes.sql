-- ============================================================
-- FIXES — hallazgos del linter de seguridad de Supabase (17 ago 2026)
-- ============================================================

-- ------------------------------------------------------------
-- 1) function_search_path_mutable — set_updated_at()
--
-- Sin `SET search_path` fijo, el search_path de la función depende
-- del que tenga la sesión que la invoca (mutable) — el linter lo
-- marca porque abre la puerta a schema-hijacking si algún día un
-- schema anterior en el search_path define un objeto con el mismo
-- nombre que algo que la función referencia. Sin cambio de
-- comportamiento: solo fija el search_path a `public`.
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2) Storage — quitar el SELECT público de storage.objects en
-- product-images, hero-images, email-images.
--
-- Los 3 buckets tienen `public = true` en storage.buckets: sirven
-- sus objetos por la URL directa (/storage/v1/object/public/{bucket}/
-- {path}) sin pasar por RLS en absoluto — ese es el mecanismo mismo
-- de "bucket público" de Supabase Storage. La policy de SELECT sobre
-- storage.objects que existía (`using (bucket_id = 'x')`) nunca
-- protegía esa URL directa; lo único que habilitaba era el endpoint
-- de LISTADO (`.storage.from('x').list()`), permitiendo enumerar con
-- la sola anon key cada archivo subido al bucket.
--
-- Confirmado contra el código (grep de `.storage.from(` en src/):
-- la app solo usa .upload() (gateado por la policy de INSERT),
-- .remove() (gateado por DELETE) y .getPublicUrl() (no hace ningún
-- request, arma el string en el cliente). Cero usos de .list() en
-- todo el repo — sacar esta policy no cambia nada de lo que la app
-- ejercita hoy.
--
-- Sin policy de SELECT, storage.objects queda deny-by-default para
-- ese comando (mismo patrón ya usado en este proyecto para
-- `redemptions`/`idempotency_keys`): las imágenes se siguen viendo
-- igual vía la URL pública, pero `.list()` con anon/authenticated ya
-- no puede enumerar el contenido del bucket.
-- ------------------------------------------------------------
drop policy if exists "product-images: lectura publica" on storage.objects;
drop policy if exists "hero-images: lectura publica" on storage.objects;
drop policy if exists "email-images: lectura publica" on storage.objects;
