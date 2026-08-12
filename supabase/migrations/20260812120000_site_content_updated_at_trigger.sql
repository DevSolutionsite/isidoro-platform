-- site_content.updated_at nunca se actualizaba en UPDATE (solo default en INSERT).
-- Ningun update de admin-site-content.ts lo seteaba a mano. Trigger cubre
-- todos los paths de escritura (Server Actions actuales, futuras, y ediciones
-- manuales desde el dashboard de Supabase).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger site_content_set_updated_at
before update on public.site_content
for each row
execute function public.set_updated_at();
