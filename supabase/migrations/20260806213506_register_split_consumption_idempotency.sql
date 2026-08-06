-- ============================================================
-- FIX HALLAZGO D (auditoría de seguridad — sistema de puntos)
--
-- register_consumption() y split_consumption() no tenían ninguna
-- protección contra doble ejecución a nivel DB: un retry de red,
-- un replay de la misma request, o alguien bypaseando el frontend
-- y llamando la API directo dos veces con los mismos datos
-- duplicaba el consumo y los puntos acreditados.
--
-- Fix: idempotency key obligatoria (uuid), generada en el browser
-- ANTES del primer intento y reusada en cualquier reintento de esa
-- misma operación. Se guarda en una tabla ledger separada (no una
-- columna en `consumptions`, porque split_consumption crea varias
-- filas por una sola invocación — la key mapea a la invocación
-- completa, no a una fila de negocio puntual).
--
-- Agregar el parámetro cambia la firma de ambas funciones, así que
-- esto NO es un CREATE OR REPLACE transparente: Postgres identifica
-- funciones por nombre + tipos de parámetros, así que hay que
-- DROPear la firma vieja antes de crear la nueva, o quedarían las
-- dos coexistiendo (la vieja, sin idempotencia, seguiría siendo
-- llamable). Y como toda función nueva recibe EXECUTE a PUBLIC por
-- default al crearse, hay que reemitir el REVOKE/GRANT del hallazgo
-- A para las firmas nuevas — si no, se pierde esa protección.
-- ============================================================

-- ============================================================
-- Tabla ledger de idempotencia
-- ============================================================
create table public.idempotency_keys (
  key           uuid        primary key,
  operation     text        not null check (operation in ('register_consumption', 'split_consumption')),
  request_hash  text        not null,
  caller_id     uuid        references public.profiles(id),
  response      jsonb,
  created_at    timestamptz not null default now()
);

alter table public.idempotency_keys enable row level security;
-- Sin policies para ningún rol: solo se toca desde adentro de las
-- funciones SECURITY DEFINER (bypasan RLS), igual que points_balance
-- y points_transactions. Nadie debe poder leer/escribir esto por REST.

-- ============================================================
-- DROP de las firmas viejas (sin idempotency key)
-- ============================================================
drop function if exists public.register_consumption(uuid, uuid, numeric, text, uuid);
drop function if exists public.split_consumption(uuid, jsonb);

-- ============================================================
-- register_consumption (con idempotency key)
-- ============================================================
create or replace function public.register_consumption(
  p_idempotency_key uuid,
  p_client_id       uuid,
  p_cashier_id      uuid,
  p_amount          numeric,
  p_notes           text    default null,
  p_session_id      uuid    default null
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
  v_hash             text;
  v_existing         record;
  v_result           json;
  v_attempt          int := 0;
begin
  -- Bloquear impersonación de cajero (hallazgo A)
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

  -- Idempotencia: reclamar la key o reproducir el resultado ya cacheado.
  v_hash := md5(
    p_client_id::text || '|' ||
    p_cashier_id::text || '|' ||
    p_amount::text || '|' ||
    coalesce(p_session_id::text, '')
  );

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 5 then
      raise exception 'idempotency_claim_failed'
        using detail = 'No se pudo reclamar la idempotency key tras varios intentos';
    end if;

    insert into public.idempotency_keys (key, operation, request_hash, caller_id)
    values (p_idempotency_key, 'register_consumption', v_hash, p_cashier_id)
    on conflict (key) do nothing;

    exit when found;

    -- Ya existe: Postgres esperó a que la tx concurrente terminara antes
    -- de resolver el conflicto, así que lo que leemos acá ya es definitivo.
    select request_hash, response into v_existing
    from public.idempotency_keys
    where key = p_idempotency_key;

    if not found then
      continue; -- la otra tx hizo rollback: el espacio quedó libre, reintentamos
    end if;

    if v_existing.request_hash <> v_hash then
      raise exception 'idempotency_key_mismatch'
        using detail = 'La idempotency key ya fue usada con parámetros distintos';
    end if;

    return v_existing.response; -- replay: mismo resultado, sin reejecutar nada
  end loop;

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

  v_result := json_build_object(
    'consumption_id', v_consumption_id,
    'points_earned',  v_points_earned,
    'new_balance',    v_new_balance
  );

  update public.idempotency_keys
  set response = v_result
  where key = p_idempotency_key;

  return v_result;
end;
$$;

-- ============================================================
-- split_consumption (con idempotency key)
-- ============================================================
create or replace function public.split_consumption(
  p_idempotency_key uuid,
  p_cashier_id      uuid,
  p_splits          jsonb
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

  -- Idempotencia
  v_hash             text;
  v_existing         record;
  v_result           json;
  v_attempt          int := 0;
begin
  -- Bloquear impersonación de cajero (hallazgo A)
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

  -- Idempotencia: reclamar la key o reproducir el resultado ya cacheado.
  v_hash := md5(p_cashier_id::text || '|' || p_splits::text);

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 5 then
      raise exception 'idempotency_claim_failed'
        using detail = 'No se pudo reclamar la idempotency key tras varios intentos';
    end if;

    insert into public.idempotency_keys (key, operation, request_hash, caller_id)
    values (p_idempotency_key, 'split_consumption', v_hash, p_cashier_id)
    on conflict (key) do nothing;

    exit when found;

    select request_hash, response into v_existing
    from public.idempotency_keys
    where key = p_idempotency_key;

    if not found then
      continue;
    end if;

    if v_existing.request_hash <> v_hash then
      raise exception 'idempotency_key_mismatch'
        using detail = 'La idempotency key ya fue usada con parámetros distintos';
    end if;

    return v_existing.response;
  end loop;

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

  v_result := json_build_object(
    'session_id', v_session_id,
    'splits',     v_results
  );

  update public.idempotency_keys
  set response = v_result
  where key = p_idempotency_key;

  return v_result;
end;
$$;

-- ============================================================
-- GRANTs: reemitir exactamente lo mismo que el hallazgo A, pero
-- para las firmas nuevas — toda función recién creada recibe
-- EXECUTE a PUBLIC por default, así que esto no es opcional.
-- ============================================================
revoke execute on function public.register_consumption(uuid, uuid, uuid, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.split_consumption(uuid, uuid, jsonb)                          from public, anon, authenticated;

grant execute on function public.register_consumption(uuid, uuid, uuid, numeric, text, uuid) to service_role;
grant execute on function public.split_consumption(uuid, uuid, jsonb)                          to service_role;
