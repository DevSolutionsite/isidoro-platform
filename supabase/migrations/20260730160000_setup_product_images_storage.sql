-- Bucket de imágenes de producto, lectura pública (se muestran en /carta sin auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Lectura pública: cualquiera (anon o autenticado) puede ver las imágenes
create policy "product-images: lectura publica"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Solo admin puede subir
create policy "product-images: admin sube"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.current_user_role() = 'admin'
  );

-- Solo admin puede reemplazar (upsert) una imagen existente
create policy "product-images: admin actualiza"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and public.current_user_role() = 'admin'
  )
  with check (
    bucket_id = 'product-images'
    and public.current_user_role() = 'admin'
  );

-- Solo admin puede eliminar
create policy "product-images: admin elimina"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.current_user_role() = 'admin'
  );
