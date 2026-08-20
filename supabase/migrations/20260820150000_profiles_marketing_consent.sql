-- Consentimiento explícito de marketing, separado de email_opt_out
-- (ese es la baja post-consentimiento; este es el opt-in inicial).
-- Desmarcado por default: sin consentimiento hasta que el cliente lo tilde.
alter table public.profiles
  add column marketing_consent boolean not null default false;

-- handle_new_user ya lee full_name de raw_user_meta_data — sumamos
-- marketing_consent con el mismo mecanismo. A diferencia de dni/phone/city
-- (que NUNCA se sincronizan desde signUp() por un gap preexistente, ver
-- 20260715034755_agregar_dni_phone_city_profiles.sql), este trigger corre
-- en el INSERT a auth.users, antes de la confirmación de mail — captura
-- el checkbox de forma confiable para cualquier flujo de signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, marketing_consent)
  values (
    new.id,
    'cliente',
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  );

  insert into public.points_balance (client_id, total_points)
  values (new.id, 0);

  return new;
end;
$$;
