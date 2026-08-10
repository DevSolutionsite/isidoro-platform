-- Bucket de imágenes para mails promocionales, lectura pública
-- (se embeben en el HTML del mail, deben resolver sin auth).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'email-images',
  'email-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "email-images: lectura publica"
  on storage.objects for select
  using (bucket_id = 'email-images');

create policy "email-images: admin sube"
  on storage.objects for insert
  with check (
    bucket_id = 'email-images'
    and public.current_user_role() = 'admin'
  );

create policy "email-images: admin actualiza"
  on storage.objects for update
  using (
    bucket_id = 'email-images'
    and public.current_user_role() = 'admin'
  )
  with check (
    bucket_id = 'email-images'
    and public.current_user_role() = 'admin'
  );

create policy "email-images: admin elimina"
  on storage.objects for delete
  using (
    bucket_id = 'email-images'
    and public.current_user_role() = 'admin'
  );
