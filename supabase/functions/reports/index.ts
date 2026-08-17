import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCorsHeaders } from '../_shared/cors.ts'

const DEFAULT_RANGE_DAYS = 30
const MAX_LIMIT = 50

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

    // Solo admin puede ver reportes de negocio
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return json({ error: 'Forbidden', code: 'insufficient_role' }, 403)
    }

    // Parsear query params
    const url        = new URL(req.url)
    const fromParam  = url.searchParams.get('from')
    const toParam    = url.searchParams.get('to')
    const limitParam = url.searchParams.get('limit')

    // Defaults: último mes si no se envían fechas
    const toDate   = toParam   ? new Date(toParam)   : new Date()
    const fromDate = fromParam ? new Date(fromParam)  : new Date(toDate.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return json({ error: 'Bad request', code: 'invalid_date_format' }, 400)
    }
    if (fromDate >= toDate) {
      return json({ error: 'Bad request', code: 'invalid_date_range', detail: 'from debe ser anterior a to' }, 400)
    }

    const limit = Math.min(
      Math.max(1, parseInt(limitParam ?? '10', 10) || 10),
      MAX_LIMIT
    )

    const fromTs = fromDate.toISOString()
    const toTs   = toDate.toISOString()

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Ejecutar las 4 consultas en paralelo
    const [summaryRes, byDayRes, topClientsRes, topRewardsRes] = await Promise.all([
      adminClient.rpc('report_summary',               { p_from: fromTs, p_to: toTs }),
      adminClient.rpc('report_consumptions_by_day',   { p_from: fromTs, p_to: toTs }),
      adminClient.rpc('report_top_clients',            { p_from: fromTs, p_to: toTs, p_limit: limit }),
      adminClient.rpc('report_top_rewards',            { p_from: fromTs, p_to: toTs, p_limit: limit }),
    ])

    // Verificar errores de cualquiera de las 4 consultas
    const errors = [summaryRes, byDayRes, topClientsRes, topRewardsRes]
      .map((r, i) => r.error ? `query[${i}]: ${r.error.message}` : null)
      .filter(Boolean)

    if (errors.length > 0) {
      console.error('report query errors:', errors)
      return json({ error: 'Internal server error', code: 'db_error', detail: errors }, 500)
    }

    // Obtener timezone desde settings para incluir en metadata
    const { data: settings } = await adminClient
      .from('settings')
      .select('timezone')
      .single()

    return json({
      period: {
        from:     fromTs,
        to:       toTs,
        timezone: settings?.timezone ?? 'America/Argentina/Buenos_Aires',
      },
      summary:             summaryRes.data,
      consumptions_by_day: byDayRes.data     ?? [],
      top_clients:         topClientsRes.data ?? [],
      top_rewards:         topRewardsRes.data ?? [],
    })
  } catch (err) {
    console.error('reports unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
