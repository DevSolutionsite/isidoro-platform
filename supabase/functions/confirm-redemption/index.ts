import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCorsHeaders } from '../_shared/cors.ts'

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

    // Solo cajero o admin pueden confirmar canjes
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
    const { code } = body

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return json({ error: 'Bad request', code: 'invalid_code_format' }, 400)
    }

    // Ejecutar función SQL atómica: valida + descuenta FIFO + confirma
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await adminClient.rpc('confirm_redemption', {
      p_code:       code,
      p_cashier_id: user.id,
    })

    if (error) {
      const errorMap: Record<string, number> = {
        unauthorized_cashier: 403,
        invalid_code:         404,
        code_expired:         400,
        insufficient_points:  400,
        out_of_stock:         400,
        fifo_underflow:       500,
      }
      const status = errorMap[error.message] ?? 500
      return json({ error: error.message, code: error.message }, status)
    }

    return json(data)
  } catch (err) {
    console.error('confirm-redemption unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
