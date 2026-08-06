-- ============================================================
-- FIX HALLAZGO A (auditoría de seguridad — sistema de puntos)
--
-- Problema: las funciones SECURITY DEFINER de puntos/reportes
-- nunca tuvieron REVOKE EXECUTE, así que Postgres las dejó con
-- el grant EXECUTE a PUBLIC que otorga por default al crearlas.
-- PostgREST expone toda función de `public` como endpoint RPC,
-- así que cualquier authenticated/anon podía invocarlas directo
-- con la anon key, saltándose por completo la Edge Function.
--
-- Encima, la lógica interna validaba que el ID recibido por
-- parámetro (p_cashier_id/p_admin_id) *perteneciera* a un
-- cajero/admin, pero nunca chequeaba que ese ID fuera el del
-- caller real (auth.uid()). Con un cashier_id filtrado (p.ej.
-- desde las propias filas de `consumptions`) cualquier cliente
-- podía llamar register_consumption/adjust_points/etc. e
-- impersonar a un cajero o admin.
--
-- Fix en dos capas:
--   1) REVOKE EXECUTE FROM PUBLIC/anon/authenticated + GRANT
--      explícito solo a service_role (el único que debe llamar
--      estas funciones, vía Edge Function).
--   2) Defensa en profundidad: dentro de cada función, si el
--      caller NO es service_role, se exige auth.uid() = ID de
--      identidad recibido por parámetro (o rol admin, para los
--      reportes). Así, aunque el grant se afloje en el futuro,
--      la impersonación sigue bloqueada.
--
-- auth.role() devuelve el claim `role` del JWT usado por
-- PostgREST ('service_role', 'authenticated' o 'anon'). Las
-- llamadas de las Edge Functions usan el cliente service_role,
-- donde auth.uid() es NULL (no hay JWT de usuario) — por eso el
-- bypass se hace por auth.role(), no por auth.uid() IS NULL
-- (que también sería NULL para un caller anon sin sesión).
-- ============================================================

-- ============================================================
-- register_consumption
-- ============================================================
create or replace function public.register_consumption(
  p_client_id   uuid,
  p_cashier_id  uuid,
  p_amount      numeric,
  p_notes       text    default null,
  p_session_id  uuid    default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points_per_peso  numeric;
  v_points_earned    int;
  v_consumption_id   uuid;
  v_new_balance      int;
begin
  -- Bloquear impersonación: si no llama vía service_role (Edge Function),
  -- el caller autenticado debe ser el mismo cajero que dice ser.
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_cashier_id then
    raise exception 'unauthorized'
      using detail = 'auth.uid() no coincide con p_cashier_id';
  end if;

  -- Validar que el cajero existe y tiene el rol correcto
  if not exists (
    select 1 from public.profiles
    where id = p_cashier_id and role in ('cajero', 'admin')
  ) then
    raise exception 'unauthorized_cashier'
      using detail = 'El ID de cajero no corresponde a un cajero o admin válido';
  end if;

  -- Validar que el cliente existe
  if not exists (
    select 1 from public.profiles
    where id = p_client_id and role = 'cliente'
  ) then
    raise exception 'client_not_found'
      using detail = 'No se encontró un cliente con ese ID';
  end if;

  -- Leer equivalencia de puntos desde settings
  select points_per_peso into v_points_per_peso
  from public.settings
  limit 1;

  -- Calcular puntos (floor: no se dan puntos parciales)
  v_points_earned := floor(p_amount * v_points_per_peso)::int;

  -- Insertar consumo
  insert into public.consumptions (client_id, cashier_id, amount, points_earned, notes, session_id)
  values (p_client_id, p_cashier_id, p_amount, v_points_earned, p_notes, p_session_id)
  returning id into v_consumption_id;

  -- Registrar transacción de puntos (vence en 12 meses)
  insert into public.points_transactions (client_id, type, consumption_id, points, expires_at)
  values (
    p_client_id,
    'consumption',
    v_consumption_id,
    v_points_earned,
    now() + interval '12 months'
  );

  -- Actualizar saldo (upsert: el trigger ya crea la fila, pero por seguridad)
  insert into public.points_balance (client_id, total_points, updated_at)
  values (p_client_id, v_points_earned, now())
  on conflict (client_id) do update
    set total_points = public.points_balance.total_points + v_points_earned,
        updated_at   = now();

  select total_points into v_new_balance
  from public.points_balance
  where client_id = p_client_id;

  return json_build_object(
    'consumption_id', v_consumption_id,
    'points_earned',  v_points_earned,
    'new_balance',    v_new_balance
  );
end;
$$;

-- ============================================================
-- confirm_redemption
-- ============================================================
create or replace function public.confirm_redemption(
  p_code       text,
  p_cashier_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption_id  uuid;
  v_client_id      uuid;
  v_reward_id      uuid;
  v_reward_name    text;
  v_points_cost    int;
  v_reward_stock   int;
  v_code_expires   timestamptz;
  v_total_points   int;
  v_to_deduct      int;
  v_new_balance    int;

  -- Para iteración FIFO
  v_bucket_expires  timestamptz;
  v_bucket_avail    int;
  v_deduct_now      int;
begin
  -- Bloquear impersonación de cajero
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_cashier_id then
    raise exception 'unauthorized'
      using detail = 'auth.uid() no coincide con p_cashier_id';
  end if;

  -- Validar cajero
  if not exists (
    select 1 from public.profiles
    where id = p_cashier_id and role in ('cajero', 'admin')
  ) then
    raise exception 'unauthorized_cashier'
      using detail = 'El ID de cajero no corresponde a un cajero o admin válido';
  end if;

  -- Buscar el canje pendiente con bloqueo para evitar race conditions
  select r.id, r.client_id, r.reward_id, r.expires_at,
         rew.name, rew.points_cost, rew.stock
  into v_redemption_id, v_client_id, v_reward_id, v_code_expires,
       v_reward_name, v_points_cost, v_reward_stock
  from public.redemptions r
  join public.rewards rew on rew.id = r.reward_id
  where r.code = p_code
    and r.status = 'pending'
  for update of r;

  if not found then
    raise exception 'invalid_code'
      using detail = 'Código inválido, ya utilizado o ya expirado';
  end if;

  -- Verificar que el código no expiró
  if v_code_expires <= now() then
    update public.redemptions
    set status = 'expired'
    where id = v_redemption_id;
    raise exception 'code_expired'
      using detail = 'El código de canje expiró. El cliente debe generar uno nuevo.';
  end if;

  -- Bloquear y verificar saldo actual
  select total_points into v_total_points
  from public.points_balance
  where client_id = v_client_id
  for update;

  if not found or v_total_points < v_points_cost then
    raise exception 'insufficient_points'
      using detail = format(
        'Saldo insuficiente. Disponible: %s, Requerido: %s',
        coalesce(v_total_points, 0),
        v_points_cost
      );
  end if;

  -- FIFO: descontar puntos del bucket más antiguo al más nuevo.
  v_to_deduct := v_points_cost;

  for v_bucket_expires, v_bucket_avail in
    select
      pt.expires_at,
      sum(pt.points)::int as net_points
    from public.points_transactions pt
    where pt.client_id = v_client_id
      and (pt.expires_at is null or pt.expires_at > now())
    group by pt.expires_at
    having sum(pt.points) > 0
    order by pt.expires_at asc nulls last
  loop
    exit when v_to_deduct <= 0;

    v_deduct_now := least(v_bucket_avail, v_to_deduct);

    insert into public.points_transactions
      (client_id, type, redemption_id, points, expires_at)
    values
      (v_client_id, 'redemption', v_redemption_id, -v_deduct_now, v_bucket_expires);

    v_to_deduct := v_to_deduct - v_deduct_now;
  end loop;

  -- Sanity check: nunca debería ocurrir si el balance es correcto
  if v_to_deduct > 0 then
    raise exception 'fifo_underflow'
      using detail = 'Error interno: discrepancia entre points_balance y points_transactions';
  end if;

  -- Actualizar saldo
  update public.points_balance
  set total_points = total_points - v_points_cost,
      updated_at   = now()
  where client_id = v_client_id
  returning total_points into v_new_balance;

  -- Decrementar stock si la recompensa tiene límite de unidades
  if v_reward_stock is not null then
    update public.rewards
    set stock      = stock - 1,
        updated_at = now()
    where id = v_reward_id
      and stock > 0;

    if not found then
      raise exception 'out_of_stock'
        using detail = 'La recompensa se agotó mientras se procesaba el canje';
    end if;
  end if;

  -- Marcar canje como confirmado
  update public.redemptions
  set status       = 'confirmed',
      cashier_id   = p_cashier_id,
      confirmed_at = now()
  where id = v_redemption_id;

  return json_build_object(
    'redemption_id',      v_redemption_id,
    'client_id',          v_client_id,
    'reward_name',        v_reward_name,
    'points_used',        v_points_cost,
    'client_new_balance', v_new_balance
  );
end;
$$;

-- ============================================================
-- split_consumption
-- ============================================================
create or replace function public.split_consumption(
  p_cashier_id uuid,
  p_splits     jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points_per_peso  numeric;
  v_session_id       uuid := gen_random_uuid();
  v_results          jsonb := '[]'::jsonb;

  -- Variables de iteración
  v_client_id        uuid;
  v_amount           numeric;
  v_points_earned    int;
  v_consumption_id   uuid;
  v_new_balance      int;
begin
  -- Bloquear impersonación de cajero
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_cashier_id then
    raise exception 'unauthorized'
      using detail = 'auth.uid() no coincide con p_cashier_id';
  end if;

  -- Validar cajero
  if not exists (
    select 1 from public.profiles
    where id = p_cashier_id and role in ('cajero', 'admin')
  ) then
    raise exception 'unauthorized_cashier'
      using detail = 'El ID de cajero no corresponde a un cajero o admin válido';
  end if;

  -- Validar que hay al menos 2 entradas
  if jsonb_array_length(p_splits) < 2 then
    raise exception 'insufficient_splits'
      using detail = 'Se requieren al menos 2 clientes para dividir una cuenta';
  end if;

  -- Validar client_ids únicos en el array
  if (
    select count(distinct (entry->>'client_id'))
    from jsonb_array_elements(p_splits) as entry
  ) < jsonb_array_length(p_splits) then
    raise exception 'duplicate_client_id'
      using detail = 'El mismo client_id aparece más de una vez en el split';
  end if;

  -- Leer equivalencia de puntos
  select points_per_peso into v_points_per_peso
  from public.settings
  limit 1;

  -- Iterar sobre cada entrada del split
  for v_client_id, v_amount in
    select
      (entry->>'client_id')::uuid,
      (entry->>'amount')::numeric
    from jsonb_array_elements(p_splits) as entry
  loop
    -- Validar monto positivo
    if v_amount <= 0 then
      raise exception 'invalid_amount'
        using detail = format('El monto para client_id %s debe ser mayor a 0', v_client_id);
    end if;

    -- Validar que el cliente existe con rol correcto
    if not exists (
      select 1 from public.profiles
      where id = v_client_id and role = 'cliente'
    ) then
      raise exception 'client_not_found'
        using detail = format('No se encontró un cliente con id %s', v_client_id);
    end if;

    -- Calcular puntos del cliente para su porción
    v_points_earned := floor(v_amount * v_points_per_peso)::int;

    -- Insertar consumo (con session_id compartido)
    insert into public.consumptions (client_id, cashier_id, amount, points_earned, session_id)
    values (v_client_id, p_cashier_id, v_amount, v_points_earned, v_session_id)
    returning id into v_consumption_id;

    -- Registrar transacción de puntos (vence en 12 meses)
    insert into public.points_transactions (client_id, type, consumption_id, points, expires_at)
    values (
      v_client_id,
      'consumption',
      v_consumption_id,
      v_points_earned,
      now() + interval '12 months'
    );

    -- Actualizar saldo (FOR UPDATE implícito en upsert via serialización del loop)
    insert into public.points_balance (client_id, total_points, updated_at)
    values (v_client_id, v_points_earned, now())
    on conflict (client_id) do update
      set total_points = public.points_balance.total_points + v_points_earned,
          updated_at   = now();

    select total_points into v_new_balance
    from public.points_balance
    where client_id = v_client_id;

    -- Acumular resultado de este cliente
    v_results := v_results || jsonb_build_object(
      'client_id',      v_client_id,
      'consumption_id', v_consumption_id,
      'points_earned',  v_points_earned,
      'new_balance',    v_new_balance
    );
  end loop;

  return json_build_object(
    'session_id', v_session_id,
    'splits',     v_results
  );
end;
$$;

-- ============================================================
-- adjust_points
-- ============================================================
create or replace function public.adjust_points(
  p_admin_id   uuid,
  p_client_id  uuid,
  p_points     int,
  p_notes      text        default null,
  p_expires_at timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id  uuid;
  v_current_balance int;
  v_new_balance     int;
begin
  -- Bloquear impersonación de admin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_admin_id then
    raise exception 'unauthorized'
      using detail = 'auth.uid() no coincide con p_admin_id';
  end if;

  -- Validar que el caller es admin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'unauthorized'
      using detail = 'Solo un administrador puede realizar ajustes manuales de puntos';
  end if;

  -- Validar que el cliente existe y tiene rol cliente
  if not exists (
    select 1 from public.profiles
    where id = p_client_id and role = 'cliente'
  ) then
    raise exception 'client_not_found'
      using detail = 'No se encontró un cliente con ese ID';
  end if;

  -- Validar que el ajuste no es cero
  if p_points = 0 then
    raise exception 'invalid_points'
      using detail = 'El ajuste de puntos no puede ser 0';
  end if;

  if p_points > 0 then
    -- CRÉDITO: fila positiva con vencimiento configurable
    insert into public.points_transactions
      (client_id, type, adjusted_by, points, notes, expires_at)
    values (
      p_client_id,
      'manual_adjustment',
      p_admin_id,
      p_points,
      p_notes,
      coalesce(p_expires_at, now() + interval '12 months')
    )
    returning id into v_transaction_id;

    -- Actualizar saldo (upsert por seguridad, el trigger ya crea la fila)
    insert into public.points_balance (client_id, total_points, updated_at)
    values (p_client_id, p_points, now())
    on conflict (client_id) do update
      set total_points = public.points_balance.total_points + p_points,
          updated_at   = now()
    returning total_points into v_new_balance;

  else
    -- DÉBITO: bloquear fila de saldo para evitar race conditions
    select total_points into v_current_balance
    from public.points_balance
    where client_id = p_client_id
    for update;

    if not found or v_current_balance < (-p_points) then
      raise exception 'insufficient_points'
        using detail = format(
          'Saldo insuficiente. Disponible: %s, Requerido: %s',
          coalesce(v_current_balance, 0),
          -p_points
        );
    end if;

    -- Fila negativa con expires_at = NULL (bucket excluido del FIFO por HAVING > 0)
    insert into public.points_transactions
      (client_id, type, adjusted_by, points, notes, expires_at)
    values (
      p_client_id,
      'manual_adjustment',
      p_admin_id,
      p_points,
      p_notes,
      null
    )
    returning id into v_transaction_id;

    -- Actualizar saldo
    update public.points_balance
    set total_points = total_points + p_points,
        updated_at   = now()
    where client_id = p_client_id
    returning total_points into v_new_balance;
  end if;

  return json_build_object(
    'transaction_id', v_transaction_id,
    'client_id',      p_client_id,
    'points',         p_points,
    'new_balance',    v_new_balance
  );
end;
$$;

-- ============================================================
-- report_summary
-- ============================================================
create or replace function public.report_summary(
  p_from timestamptz,
  p_to   timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumption_stats record;
  v_points_stats      record;
begin
  if auth.role() <> 'service_role' and public.current_user_role() <> 'admin' then
    raise exception 'unauthorized'
      using detail = 'Solo un administrador puede acceder a reportes';
  end if;

  select
    count(*)::int                    as total_consumptions,
    coalesce(sum(amount), 0)         as total_revenue,
    count(distinct client_id)::int   as unique_clients
  into v_consumption_stats
  from public.consumptions
  where consumed_at >= p_from
    and consumed_at <  p_to;

  select
    coalesce(sum(case when type = 'consumption' and points > 0 then points else 0 end), 0)::int as total_credited,
    coalesce(abs(sum(case when type = 'redemption' then points else 0 end)), 0)::int             as total_redeemed
  into v_points_stats
  from public.points_transactions
  where created_at >= p_from
    and created_at <  p_to;

  return json_build_object(
    'total_revenue',         v_consumption_stats.total_revenue,
    'total_consumptions',    v_consumption_stats.total_consumptions,
    'unique_clients',        v_consumption_stats.unique_clients,
    'total_points_credited', v_points_stats.total_credited,
    'total_points_redeemed', v_points_stats.total_redeemed
  );
end;
$$;

-- ============================================================
-- report_consumptions_by_day
-- ============================================================
create or replace function public.report_consumptions_by_day(
  p_from timestamptz,
  p_to   timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone text;
begin
  if auth.role() <> 'service_role' and public.current_user_role() <> 'admin' then
    raise exception 'unauthorized'
      using detail = 'Solo un administrador puede acceder a reportes';
  end if;

  select timezone into v_timezone from public.settings limit 1;

  return coalesce(
    (
      select json_agg(row_to_json(r) order by r.date)
      from (
        select
          (date_trunc('day', consumed_at at time zone v_timezone))::date as date,
          count(*)::int                                                   as count,
          sum(amount)::numeric                                            as total_amount,
          sum(points_earned)::int                                         as points_earned
        from public.consumptions
        where consumed_at >= p_from
          and consumed_at <  p_to
        group by 1
        order by 1
      ) r
    ),
    '[]'::json
  );
end;
$$;

-- ============================================================
-- report_top_clients
-- ============================================================
create or replace function public.report_top_clients(
  p_from  timestamptz,
  p_to    timestamptz,
  p_limit int default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and public.current_user_role() <> 'admin' then
    raise exception 'unauthorized'
      using detail = 'Solo un administrador puede acceder a reportes';
  end if;

  return coalesce(
    (
      select json_agg(row_to_json(r))
      from (
        select
          c.client_id,
          p.full_name,
          count(*)::int          as visit_count,
          sum(c.amount)::numeric as total_spent,
          sum(c.points_earned)::int as total_points_earned
        from public.consumptions c
        join public.profiles p on p.id = c.client_id
        where c.consumed_at >= p_from
          and c.consumed_at <  p_to
        group by c.client_id, p.full_name
        order by total_spent desc
        limit p_limit
      ) r
    ),
    '[]'::json
  );
end;
$$;

-- ============================================================
-- report_top_rewards
-- ============================================================
create or replace function public.report_top_rewards(
  p_from  timestamptz,
  p_to    timestamptz,
  p_limit int default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and public.current_user_role() <> 'admin' then
    raise exception 'unauthorized'
      using detail = 'Solo un administrador puede acceder a reportes';
  end if;

  return coalesce(
    (
      select json_agg(row_to_json(r))
      from (
        select
          r.id                       as reward_id,
          r.name                     as reward_name,
          count(*)::int              as redemption_count,
          sum(red.points_used)::int  as total_points_used
        from public.redemptions red
        join public.rewards r on r.id = red.reward_id
        where red.status       = 'confirmed'
          and red.confirmed_at >= p_from
          and red.confirmed_at <  p_to
        group by r.id, r.name
        order by redemption_count desc
        limit p_limit
      ) r
    ),
    '[]'::json
  );
end;
$$;

-- ============================================================
-- GRANTs: quitar EXECUTE público, dejar solo service_role
-- (las Edge Functions son el único caller legítimo de estas 8)
-- ============================================================
revoke execute on function public.register_consumption(uuid, uuid, numeric, text, uuid)          from public, anon, authenticated;
revoke execute on function public.confirm_redemption(text, uuid)                                 from public, anon, authenticated;
revoke execute on function public.split_consumption(uuid, jsonb)                                 from public, anon, authenticated;
revoke execute on function public.adjust_points(uuid, uuid, int, text, timestamptz)               from public, anon, authenticated;
revoke execute on function public.report_summary(timestamptz, timestamptz)                       from public, anon, authenticated;
revoke execute on function public.report_consumptions_by_day(timestamptz, timestamptz)           from public, anon, authenticated;
revoke execute on function public.report_top_clients(timestamptz, timestamptz, int)              from public, anon, authenticated;
revoke execute on function public.report_top_rewards(timestamptz, timestamptz, int)              from public, anon, authenticated;

grant execute on function public.register_consumption(uuid, uuid, numeric, text, uuid)           to service_role;
grant execute on function public.confirm_redemption(text, uuid)                                  to service_role;
grant execute on function public.split_consumption(uuid, jsonb)                                  to service_role;
grant execute on function public.adjust_points(uuid, uuid, int, text, timestamptz)                to service_role;
grant execute on function public.report_summary(timestamptz, timestamptz)                        to service_role;
grant execute on function public.report_consumptions_by_day(timestamptz, timestamptz)            to service_role;
grant execute on function public.report_top_clients(timestamptz, timestamptz, int)               to service_role;
grant execute on function public.report_top_rewards(timestamptz, timestamptz, int)               to service_role;
