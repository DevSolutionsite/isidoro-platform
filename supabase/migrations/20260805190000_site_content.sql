-- Contenido editable de la landing (/): imagenes del hero y horarios de atencion.
-- Fila unica, mismo patron que `settings`.
create table public.site_content (
  id          uuid primary key default gen_random_uuid(),
  hero_images text[] not null default '{}',
  hours_text  text,
  updated_at  timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Lectura publica: la landing la muestra sin auth
create policy "site_content: lectura publica"
  on public.site_content for select
  using (true);

-- Solo admin puede actualizar (fila unica, sin insert/delete desde la app)
create policy "site_content: admin actualiza"
  on public.site_content for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

insert into public.site_content (hero_images, hours_text) values ('{}', null);

-- Bucket de imagenes del hero, lectura publica (se muestran en / sin auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-images',
  'hero-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "hero-images: lectura publica"
  on storage.objects for select
  using (bucket_id = 'hero-images');

create policy "hero-images: admin sube"
  on storage.objects for insert
  with check (
    bucket_id = 'hero-images'
    and public.current_user_role() = 'admin'
  );

create policy "hero-images: admin actualiza"
  on storage.objects for update
  using (
    bucket_id = 'hero-images'
    and public.current_user_role() = 'admin'
  )
  with check (
    bucket_id = 'hero-images'
    and public.current_user_role() = 'admin'
  );

create policy "hero-images: admin elimina"
  on storage.objects for delete
  using (
    bucket_id = 'hero-images'
    and public.current_user_role() = 'admin'
  );
