-- Fix: handle_new_user no leía dni/phone/city de raw_user_meta_data pese a que
-- RegisterForm.tsx los manda en signUp() options.data (gap documentado en
-- 20260715034755_agregar_dni_phone_city_profiles.sql). Resultado: doble carga
-- en /completar-perfil para todo signup nuevo por email/password.
-- Mismo patrón que marketing_consent (20260820150000): raw_user_meta_data
-- está disponible en el INSERT a auth.users, antes de confirmar mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, dni, phone, city, marketing_consent)
  values (
    new.id,
    'cliente',
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'dni',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city',
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false)
  );

  insert into public.points_balance (client_id, total_points)
  values (new.id, 0);

  return new;
end;
$$;
