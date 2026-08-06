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

    // Solo clientes pueden iniciar canjes
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'cliente') {
      return json({ error: 'Forbidden', code: 'insufficient_role' }, 403)
    }

    // Validar body
    const body = await req.json()
    const { reward_id } = body

    if (!reward_id || typeof reward_id !== 'string') {
      return json({ error: 'Bad request', code: 'missing_reward_id' }, 400)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Reward y balance son independientes entre sí — se piden en paralelo
    // para no pagar dos round-trips secuenciales a la DB.
    const [{ data: reward, error: rewardError }, { data: balance }] = await Promise.all([
      adminClient
        .from('rewards')
        .select('id, name, points_cost, stock, is_active')
        .eq('id', reward_id)
        .single(),
      adminClient
        .from('points_balance')
        .select('total_points')
        .eq('client_id', user.id)
        .single(),
    ])

    // Verificar que la recompensa existe, está activa y tiene stock
    if (rewardError || !reward) {
      return json({ error: 'Reward not found', code: 'reward_not_found' }, 404)
    }
    if (!reward.is_active) {
      return json({ error: 'Reward is not active', code: 'reward_inactive' }, 400)
    }
    if (reward.stock !== null && reward.stock <= 0) {
      return json({ error: 'Reward out of stock', code: 'out_of_stock' }, 400)
    }

    // Verificar saldo del cliente (DEC-012: validación en backend obligatoria)
    const availablePoints = balance?.total_points ?? 0

    if (availablePoints < reward.points_cost) {
      return json({
        error:     'Insufficient points',
        code:      'insufficient_points',
        available: availablePoints,
        required:  reward.points_cost,
      }, 400)
    }

    // Genera código numérico de 6 dígitos (DEC-009)
    const generateCode = () => {
      const arr = new Uint32Array(1)
      crypto.getRandomValues(arr)
      return String(arr[0] % 1_000_000).padStart(6, '0')
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    // Insertar el canje pendiente. redemptions_code_pending_unique (índice
    // único parcial sobre code WHERE status='pending') puede rechazar el
    // insert si el código random choca con otro canje pendiente activo
    // (paradoja del cumpleaños, espacio de 1M códigos) — se reintenta con
    // un código nuevo hasta 5 veces antes de rendirse. Cualquier otro tipo
    // de error corta el loop de inmediato, no es un caso para reintentar.
    const MAX_CODE_ATTEMPTS = 5
    let redemption: { id: string; code: string; expires_at: string } | null = null
    let lastError: unknown = null

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const { data, error } = await adminClient
        .from('redemptions')
        .insert({
          client_id:   user.id,
          reward_id:   reward_id,
          code:        generateCode(),
          status:      'pending',
          points_used: reward.points_cost,
          expires_at:  expiresAt,
        })
        .select('id, code, expires_at')
        .single()

      if (!error && data) {
        redemption = data
        break
      }

      lastError = error
      if (error?.code !== '23505') break
    }

    if (!redemption) {
      console.error('initiate-redemption insert error:', lastError)
      return json({ error: 'Failed to create redemption', code: 'db_error' }, 500)
    }

    return json({
      redemption_id: redemption.id,
      code:          redemption.code,
      expires_at:    redemption.expires_at,
    })
  } catch (err) {
    console.error('initiate-redemption unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
