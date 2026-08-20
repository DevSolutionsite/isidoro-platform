-- Imagen de fondo opcional para promociones y ofertas por horario —
-- mismo patrón que product-images (20260730160000_setup_product_images_storage.sql):
-- columna image_url + bucket público 1:1 por tabla, solo admin escribe.

alter table public.promotions
  add column image_url text;

alter table public.time_offers
  add column image_url text;

-- ============================================================
-- BUCKET: promotion-images
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promotion-images',
  'promotion-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "promotion-images: lectura publica"
  on storage.objects for select
  using (bucket_id = 'promotion-images');

create policy "promotion-images: admin sube"
  on storage.objects for insert
  with check (
    bucket_id = 'promotion-images'
    and public.current_user_role() = 'admin'
  );

create policy "promotion-images: admin actualiza"
  on storage.objects for update
  using (
    bucket_id = 'promotion-images'
    and public.current_user_role() = 'admin'
  )
  with check (
    bucket_id = 'promotion-images'
    and public.current_user_role() = 'admin'
  );

create policy "promotion-images: admin elimina"
  on storage.objects for delete
  using (
    bucket_id = 'promotion-images'
    and public.current_user_role() = 'admin'
  );

-- ============================================================
-- BUCKET: time-offer-images
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'time-offer-images',
  'time-offer-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "time-offer-images: lectura publica"
  on storage.objects for select
  using (bucket_id = 'time-offer-images');

create policy "time-offer-images: admin sube"
  on storage.objects for insert
  with check (
    bucket_id = 'time-offer-images'
    and public.current_user_role() = 'admin'
  );

create policy "time-offer-images: admin actualiza"
  on storage.objects for update
  using (
    bucket_id = 'time-offer-images'
    and public.current_user_role() = 'admin'
  )
  with check (
    bucket_id = 'time-offer-images'
    and public.current_user_role() = 'admin'
  );

create policy "time-offer-images: admin elimina"
  on storage.objects for delete
  using (
    bucket_id = 'time-offer-images'
    and public.current_user_role() = 'admin'
  );
