import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type SplitEntry = {
  client_id: string
  amount:    number
}

Deno.serve(async (req) => {
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

    // Validar total_amount si fue enviado (tolerancia ±0.01 para flotantes)
    if (total_amount !== undefined) {
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
    }

    // Ejecutar función SQL atómica vía service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

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
