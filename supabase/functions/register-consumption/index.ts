import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    // Verificar rol: solo cajero o admin pueden registrar consumos
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
    const { client_id, amount, notes, session_id, idempotency_key } = body

    if (!client_id || typeof client_id !== 'string') {
      return json({ error: 'Bad request', code: 'missing_client_id' }, 400)
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return json({ error: 'Bad request', code: 'invalid_amount' }, 400)
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof idempotency_key !== 'string' || !UUID_RE.test(idempotency_key)) {
      return json({ error: 'Bad request', code: 'missing_idempotency_key' }, 400)
    }

    // Ejecutar función SQL atómica vía service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await adminClient.rpc('register_consumption', {
      p_idempotency_key: idempotency_key,
      p_client_id:        client_id,
      p_cashier_id:       user.id,
      p_amount:           amount,
      p_notes:            notes ?? null,
      p_session_id:       session_id ?? null,
    })

    if (error) {
      const errorMap: Record<string, number> = {
        unauthorized_cashier:        403,
        client_not_found:            404,
        idempotency_key_mismatch:    409,
        idempotency_claim_failed:    500,
      }
      const status = errorMap[error.message] ?? 500
      return json({ error: error.message, code: error.message }, status)
    }

    return json(data)
  } catch (err) {
    console.error('register-consumption unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
