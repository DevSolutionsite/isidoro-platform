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

    // Verificar rol: solo admin puede hacer ajustes manuales
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return json({ error: 'Forbidden', code: 'insufficient_role' }, 403)
    }

    // Validar body
    const body = await req.json()
    const { client_id, points, notes, expires_at } = body

    if (!client_id || typeof client_id !== 'string') {
      return json({ error: 'Bad request', code: 'missing_client_id' }, 400)
    }
    if (points === undefined || typeof points !== 'number' || !Number.isInteger(points) || points === 0) {
      return json({ error: 'Bad request', code: 'invalid_points' }, 400)
    }
    if (expires_at !== undefined && typeof expires_at !== 'string') {
      return json({ error: 'Bad request', code: 'invalid_expires_at' }, 400)
    }

    // Ejecutar función SQL atómica vía service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await adminClient.rpc('adjust_points', {
      p_admin_id:   user.id,
      p_client_id:  client_id,
      p_points:     points,
      p_notes:      notes ?? null,
      p_expires_at: expires_at ?? null,
    })

    if (error) {
      const statusMap: Record<string, number> = {
        unauthorized:       403,
        client_not_found:   404,
        insufficient_points: 400,
        invalid_points:     400,
      }
      const status = statusMap[error.message] ?? 500
      return json({ error: error.message, code: error.message }, status)
    }

    return json(data)
  } catch (err) {
    console.error('adjust-points unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
