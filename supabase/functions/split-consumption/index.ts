import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCorsHeaders } from '../_shared/cors.ts'

type SplitEntry = {
  client_id: string
  amount:    number
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    // Verificar identidad del caller vía JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    // Solo cajero o admin pueden registrar consumos divididos
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['cajero', 'admin'].includes(profile.role)) {
      return json({ error: 'Forbidden', code: 'insufficient_role' }, 403)
    }

    // Validar body
    const body = await req.json()
    const { splits, total_amount, idempotency_key } = body

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof idempotency_key !== 'string' || !UUID_RE.test(idempotency_key)) {
      return json({ error: 'Bad request', code: 'missing_idempotency_key' }, 400)
    }

    if (!Array.isArray(splits) || splits.length < 2) {
      return json({
        error: 'Bad request',
        code:  'insufficient_splits',
        detail: 'splits debe ser un array con al menos 2 entradas',
      }, 400)
    }

    // Validar estructura de cada entrada
    for (const entry of splits as SplitEntry[]) {
      if (!entry.client_id || typeof entry.client_id !== 'string') {
        return json({ error: 'Bad request', code: 'invalid_client_id' }, 400)
      }
      if (typeof entry.amount !== 'number' || entry.amount <= 0) {
        return json({
          error:  'Bad request',
          code:   'invalid_amount',
          detail: `amount inválido para client_id ${entry.client_id}`,
        }, 400)
      }
    }

    // Validar client_ids únicos
    const ids = (splits as SplitEntry[]).map((s) => s.client_id)
    if (new Set(ids).size !== ids.length) {
      return json({ error: 'Bad request', code: 'duplicate_client_id' }, 400)
    }

    // total_amount es obligatorio (hallazgo de UX/seguridad: sin esto, nada
    // impide que la suma de splits diverja del total real de la mesa si se
    // bypasea el frontend).
    if (typeof total_amount !== 'number' || total_amount <= 0) {
      return json({ error: 'Bad request', code: 'missing_total_amount' }, 400)
    }

    // Validar que la suma de splits coincida (tolerancia ±0.01 para flotantes)
    const splitsSum = (splits as SplitEntry[]).reduce((acc, s) => acc + s.amount, 0)
    if (Math.abs(splitsSum - total_amount) > 0.01) {
      return json({
        error:    'Bad request',
        code:     'amount_mismatch',
        detail:   `La suma de splits (${splitsSum.toFixed(2)}) no coincide con total_amount (${total_amount})`,
        sum:      splitsSum,
        expected: total_amount,
      }, 400)
    }

    // Ejecutar función SQL atómica vía service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Hallazgo F: tope configurable, por entrada (igual que el check > 0
    // de arriba) — se valida acá además de en la función SQL para
    // devolver el error sin gastar un intento de idempotency key.
    const { data: settings } = await adminClient
      .from('settings')
      .select('max_consumption_amount')
      .single()

    if (settings?.max_consumption_amount != null) {
      const tooLarge = (splits as SplitEntry[]).find((s) => s.amount > settings.max_consumption_amount)
      if (tooLarge) {
        return json({
          error:  'Bad request',
          code:   'amount_too_large',
          detail: `El monto para client_id ${tooLarge.client_id} supera el máximo permitido`,
        }, 400)
      }
    }

    const { data, error } = await adminClient.rpc('split_consumption', {
      p_idempotency_key: idempotency_key,
      p_cashier_id:       user.id,
      p_splits:           splits,
    })

    if (error) {
      const errorMap: Record<string, number> = {
        unauthorized_cashier:     403,
        insufficient_splits:      400,
        duplicate_client_id:      400,
        invalid_amount:           400,
        amount_too_large:         400,
        client_not_found:         404,
        idempotency_key_mismatch: 409,
        idempotency_claim_failed: 500,
      }
      const status = errorMap[error.message] ?? 500
      return json({ error: error.message, code: error.message }, status)
    }

    return json(data)
  } catch (err) {
    console.error('split-consumption unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
