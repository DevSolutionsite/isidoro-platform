# API_CONTRACTS.md — Contratos de API
> Kevin completa este documento al terminar cada endpoint. Fran lo usa para integrar sin preguntar.
> Última actualización: 19 de junio de 2026 — Kevin (Backend Agent)

---

## Convenciones generales

- Base URL: `https://<PROJECT_REF>.supabase.co` (disponible en `.env.local` como `NEXT_PUBLIC_SUPABASE_URL`)
- Auth: todas las rutas privadas requieren `Authorization: Bearer <supabase_jwt>`
- Respuestas: JSON. Errores siempre con `{ error: string, code?: string }`
- PostgREST: endpoints automáticos de Supabase, filtros via query params
- Edge Functions: lógica de negocio compleja, prefijo `/functions/v1/`

---

## Estado de implementación

| Endpoint | Método | Tipo | Estado |
|---|---|---|---|
| GET /rest/v1/settings | GET | PostgREST | ✅ Listo |
| GET /rest/v1/categories | GET | PostgREST | ✅ Listo |
| POST /rest/v1/categories | POST | PostgREST | ✅ Listo |
| PATCH /rest/v1/categories | PATCH | PostgREST | ✅ Listo |
| GET /rest/v1/products | GET | PostgREST | ✅ Listo |
| POST /rest/v1/products | POST | PostgREST | ✅ Listo |
| PATCH /rest/v1/products | PATCH | PostgREST | ✅ Listo |
| GET /rest/v1/promotions | GET | PostgREST | ✅ Listo |
| POST /rest/v1/promotions | POST | PostgREST | ✅ Listo |
| GET /rest/v1/time_offers | GET | PostgREST | ✅ Listo |
| GET /rest/v1/rewards | GET | PostgREST | ✅ Listo |
| POST /rest/v1/rewards | POST | PostgREST | ✅ Listo (verificado en vivo por Fran, DEC-036) |
| PATCH /rest/v1/rewards | PATCH | PostgREST | ✅ Listo (verificado en vivo por Fran, DEC-036) |
| GET /rest/v1/profiles | GET | PostgREST | ✅ Listo |
| GET /rest/v1/points_balance | GET | PostgREST | ✅ Listo |
| GET /rest/v1/points_transactions | GET | PostgREST | ✅ Listo |
| GET /rest/v1/redemptions | GET | PostgREST | ✅ Listo |
| POST /functions/v1/register-consumption | POST | Edge Function | ✅ Listo |
| POST /functions/v1/initiate-redemption | POST | Edge Function | ✅ Listo |
| POST /functions/v1/confirm-redemption | POST | Edge Function | ✅ Listo |
| POST /functions/v1/split-consumption | POST | Edge Function | ✅ Listo |
| GET /functions/v1/reports | GET | Edge Function | ✅ Listo |
| POST /functions/v1/adjust-points | POST | Edge Function | ✅ Listo |

---

## Auth (Supabase Auth — no requiere implementación manual)

**Registro con email/password**
```
POST /auth/v1/signup
Body: { email, password, options: { data: { full_name: "Nombre Apellido" } } }
Response: { user, session }
```
> ⚠️ `full_name` es obligatorio en `options.data`. El trigger `handle_new_user` lo lee de `raw_user_meta_data`.

**Login con email/password**
```
POST /auth/v1/token?grant_type=password
Body: { email, password }
Response: { access_token, token_type, user }
```

**Login con Google OAuth**
```typescript
// En el cliente Next.js:
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/auth/callback` }
})
```
> Redirect URL configurada: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

---

## Settings

**GET /rest/v1/settings**
- Auth: No requerida (lectura pública)
- Fran: leer `timezone` para calcular ofertas activas por horario (DEC-013)
```typescript
// Request
supabase.from('settings').select('points_per_peso, timezone').single()

// Response
{
  "points_per_peso": 1.0,
  "timezone": "America/Argentina/Buenos_Aires"
}
```

---

## Categorías

**GET /rest/v1/categories**
- Auth: No requerida (lectura pública)
- RLS filtra automáticamente `deleted_at IS NULL`
```typescript
supabase
  .from('categories')
  .select('*')
  .order('sort_order', { ascending: true })

// Response: Category[]
[
  { "id": "uuid", "name": "Entradas", "sort_order": 1, "deleted_at": null, "created_at": "...", "updated_at": "..." }
]
```

**POST /rest/v1/categories**
- Auth: Sí (rol admin)
```typescript
supabase.from('categories').insert({ name: "Postres", sort_order: 4 })
// Body mínimo: { name: string, sort_order?: number }
```

**PATCH /rest/v1/categories?id=eq.{id}**
- Auth: Sí (rol admin)
```typescript
supabase.from('categories').update({ name: "Bebidas" }).eq('id', id)
// Soft delete:
supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id)
```

---

## Productos

**GET /rest/v1/products**
- Auth: No requerida (lectura pública)
- RLS filtra automáticamente `deleted_at IS NULL`
```typescript
// Carta pública completa (con categorías embebidas)
supabase
  .from('products')
  .select('*, categories(name, sort_order)')
  .eq('is_available', true)
  .order('sort_order', { ascending: true })

// Por categoría
supabase
  .from('products')
  .select('*')
  .eq('category_id', categoryId)
  .eq('is_available', true)
  .order('sort_order', { ascending: true })

// Response: Product[]
[
  {
    "id": "uuid",
    "category_id": "uuid",
    "name": "Milanesa napolitana",
    "description": "Con jamón, mozzarella y tomate",
    "price": 3500.00,
    "image_url": "https://...",
    "is_available": true,
    "sort_order": 1,
    "deleted_at": null,
    "categories": { "name": "Principales", "sort_order": 2 }
  }
]
```

**POST /rest/v1/products**
- Auth: Sí (rol admin)
```typescript
supabase.from('products').insert({
  category_id: "uuid",
  name: "Café con leche",
  price: 800.00,
  sort_order: 1
})
// Campos opcionales: description, image_url, is_available (default true)
```

**PATCH /rest/v1/products?id=eq.{id}**
- Auth: Sí (rol admin)
```typescript
// Editar
supabase.from('products').update({ price: 900.00, is_available: false }).eq('id', id)
// Soft delete
supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id)
```

---

## Promociones

**GET /rest/v1/promotions**
- Auth: No requerida (lectura pública)
```typescript
// Promociones vigentes hoy
const now = new Date().toISOString()
supabase
  .from('promotions')
  .select('*')
  .eq('is_active', true)
  .lte('valid_from', now)
  .gte('valid_until', now)
  .order('valid_from', { ascending: false })
```

**POST /rest/v1/promotions**
- Auth: Sí (rol admin)
```typescript
supabase.from('promotions').insert({
  name: "2x1 en pizzas",
  description: "Todos los lunes",
  valid_from: "2026-06-16T00:00:00Z",
  valid_until: "2026-06-30T23:59:59Z"
})
```

---

## Ofertas por horario

**GET /rest/v1/time_offers**
- Auth: No requerida (lectura pública)
- ⚠️ La lógica "activa ahora" se calcula en el cliente usando `settings.timezone` (DEC-013)
```typescript
// Fran: obtener todas las activas + sus productos
supabase
  .from('time_offers')
  .select('*, time_offer_products(product_id)')
  .eq('is_active', true)

// Response
[
  {
    "id": "uuid",
    "name": "Happy Hour",
    "description": "Bebidas al 50%",
    "start_time": "18:00:00",
    "end_time": "20:00:00",
    "is_active": true,
    "time_offer_products": [
      { "product_id": "uuid" }
    ]
  }
]

// Fran: calcular si está activa ahora
function isTimeOfferActive(offer: TimeOffer, timezone: string): boolean {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const localTime = formatter.format(now) // "HH:MM:SS"
  return localTime >= offer.start_time && localTime <= offer.end_time
}
```

---

## Recompensas

**GET /rest/v1/rewards**
- Auth: No requerida (lectura pública)
- RLS filtra automáticamente `is_active = true`
```typescript
supabase
  .from('rewards')
  .select('*')
  .order('points_cost', { ascending: true })

// Response: Reward[]
[
  {
    "id": "uuid",
    "name": "Café gratis",
    "description": "Un café simple o con leche",
    "points_cost": 50,
    "stock": 100,
    "is_active": true
  }
]
```

**POST /rest/v1/rewards**
- Auth: Sí (rol admin)
- ⚠️ No estaba documentado — verificado en vivo por Fran el 8 de agosto de 2026 (login real como admin + POST/PATCH/DELETE de prueba contra producción, ver DEC-036). Misma policy RLS que `products`/`categories` (`exists (... role = 'admin')`), funciona igual sin cambios de Kevin.
```typescript
supabase.from('rewards').insert({
  name: "Café gratis",
  points_cost: 50,
  stock: 100,       // opcional, null = sin límite
  is_active: true,  // opcional, default true
})
// Campos opcionales: description, stock, is_active
```

**PATCH /rest/v1/rewards?id=eq.{id}**
- Auth: Sí (rol admin)
- Sin `deleted_at` en esta tabla (a diferencia de `products`/`categories`) — "eliminar" es `update({ is_active: false })`, mismo patrón que `promotions`.
```typescript
supabase.from('rewards').update({ points_cost: 60, stock: 50 }).eq('id', id)
// "Eliminar" (ocultar del canje):
supabase.from('rewards').update({ is_active: false }).eq('id', id)
```

---

## Perfil del cliente

**GET /rest/v1/profiles**
- Auth: Sí (cualquier rol autenticado)
- RLS: cliente ve solo el suyo; cajero y admin ven todos

```typescript
// Cliente: obtener propio perfil
supabase.from('profiles').select('*').eq('id', userId).single()

// Cajero: buscar cliente por QR token (al escanear el QR)
supabase
  .from('profiles')
  .select('id, full_name, phone, qr_token')
  .eq('qr_token', qrToken)
  .single()

// Response
{
  "id": "uuid",
  "role": "cliente",
  "full_name": "María García",
  "dni": "30123456",
  "phone": "+54911...",
  "city": "Buenos Aires",
  "qr_token": "abc123...",
  "created_at": "...",
  "updated_at": "..."
}

// dni, phone y city pueden venir null: obligatorios a nivel app para
// role='cliente', pero el signup (email/password o Google) no los pide
// — se completan después en la UI de perfil.
```

---

## Saldo de puntos

**GET /rest/v1/points_balance**
- Auth: Sí
- RLS: cliente ve solo el suyo; cajero y admin ven todos

```typescript
// Cliente: propio saldo
supabase
  .from('points_balance')
  .select('total_points, updated_at')
  .eq('client_id', userId)
  .single()

// Cajero: saldo de un cliente específico (después de escanear QR)
supabase
  .from('points_balance')
  .select('total_points')
  .eq('client_id', clientId)
  .single()

// Response
{ "total_points": 150, "updated_at": "2026-06-15T20:00:00Z" }
```

---

## Historial de puntos

**GET /rest/v1/points_transactions**
- Auth: Sí
- RLS: cliente ve solo los suyos; cajero y admin ven todos

```typescript
// Historial del cliente autenticado (últimas 20 transacciones)
supabase
  .from('points_transactions')
  .select('id, type, points, expires_at, created_at, consumptions(amount, consumed_at), redemptions(rewards(name))')
  .eq('client_id', userId)
  .order('created_at', { ascending: false })
  .limit(20)

// Response: PointsTransaction[]
[
  {
    "id": "uuid",
    "type": "consumption",
    "points": 35,
    "expires_at": "2027-06-15T20:00:00Z",
    "created_at": "2026-06-15T20:00:00Z",
    "consumptions": { "amount": 3500.00, "consumed_at": "2026-06-15T20:00:00Z" }
  },
  {
    "id": "uuid",
    "type": "redemption",
    "points": -50,
    "expires_at": "2027-06-15T20:00:00Z",
    "created_at": "2026-06-15T21:00:00Z",
    "redemptions": { "rewards": { "name": "Café gratis" } }
  }
]
```

---

## Canjes

**GET /rest/v1/redemptions**
- Auth: Sí
- RLS: cliente ve los suyos; cajero y admin ven todos

```typescript
// Cliente: canjes pendientes activos
supabase
  .from('redemptions')
  .select('id, code, status, expires_at, rewards(name, points_cost)')
  .eq('client_id', userId)
  .eq('status', 'pending')
  .gt('expires_at', new Date().toISOString())

// Historial completo
supabase
  .from('redemptions')
  .select('*, rewards(name)')
  .eq('client_id', userId)
  .order('created_at', { ascending: false })
```

---

## Edge Functions

### POST /functions/v1/register-consumption

El cajero registra un consumo. Calcula y acredita puntos automáticamente (atómico).

- **Auth:** Sí — rol `cajero` o `admin`
- **Implementación:** `supabase/functions/register-consumption/index.ts`

```typescript
// Request
const { data, error } = await supabase.functions.invoke('register-consumption', {
  body: {
    client_id:  "uuid",       // obligatorio: UUID del cliente
    amount:     1500.00,      // obligatorio: monto en pesos ARS (> 0)
    notes:      "Mesa 5",     // opcional
    session_id: "uuid",       // opcional: para división de cuenta (DEC-007)
  }
})

// Response 200
{
  "consumption_id": "uuid",
  "points_earned":  15,
  "new_balance":    42
}

// Errores posibles
// 401 { "error": "Unauthorized" }
// 403 { "error": "Forbidden", "code": "insufficient_role" }
// 400 { "error": "Bad request", "code": "missing_client_id" | "invalid_amount" }
// 404 { "error": "client_not_found", "code": "client_not_found" }
// 500 { "error": "Internal server error" }
```

---

### POST /functions/v1/initiate-redemption

El cliente inicia un canje. Valida saldo, genera código numérico de 6 dígitos.

- **Auth:** Sí — rol `cliente`
- **Implementación:** `supabase/functions/initiate-redemption/index.ts`

```typescript
// Request
const { data, error } = await supabase.functions.invoke('initiate-redemption', {
  body: {
    reward_id: "uuid"  // obligatorio
  }
})

// Response 200
{
  "redemption_id": "uuid",
  "code":          "384921",   // char(6) numérico
  "expires_at":    "2026-06-15T21:05:00Z"  // now() + 5 minutos (DEC-032)
}

// Errores posibles
// 401 { "error": "Unauthorized" }
// 403 { "error": "Forbidden", "code": "insufficient_role" }
// 400 { "error": "Bad request", "code": "missing_reward_id" }
// 400 { "error": "Reward is not active", "code": "reward_inactive" }
// 400 { "error": "Reward out of stock", "code": "out_of_stock" }
// 400 { "error": "Insufficient points", "code": "insufficient_points", "available": N, "required": M }
// 404 { "error": "Reward not found", "code": "reward_not_found" }
```

---

### POST /functions/v1/confirm-redemption

El cajero confirma el canje ingresando el código. Descuenta puntos FIFO y reduce stock. **Operación atómica garantizada.**

- **Auth:** Sí — rol `cajero` o `admin`
- **Implementación:** `supabase/functions/confirm-redemption/index.ts`
- ⚠️ Todo o nada: si falla cualquier paso, se revierte todo.

```typescript
// Request
const { data, error } = await supabase.functions.invoke('confirm-redemption', {
  body: {
    code: "384921"  // obligatorio: 6 dígitos numéricos
  }
})

// Response 200
{
  "redemption_id":      "uuid",
  "client_id":          "uuid",
  "reward_name":        "Café gratis",
  "points_used":        50,
  "client_new_balance": 17
}

// Errores posibles
// 401 { "error": "Unauthorized" }
// 403 { "error": "Forbidden", "code": "insufficient_role" }
// 400 { "error": "Bad request", "code": "invalid_code_format" }
// 404 { "error": "invalid_code", "code": "invalid_code" }
// 400 { "error": "code_expired", "code": "code_expired" }
// 400 { "error": "insufficient_points", "code": "insufficient_points" }
// 400 { "error": "out_of_stock", "code": "out_of_stock" }
```

---

### POST /functions/v1/split-consumption

El cajero divide una cuenta de mesa entre N clientes. Cada uno recibe su propia fila en `consumptions` y gana puntos proporcionales a su monto. **Operación atómica garantizada** — si falla cualquier cliente, ninguno recibe puntos.

- **Auth:** Sí — rol `cajero` o `admin`
- **Implementación:** `supabase/functions/split-consumption/index.ts`
- **SQL function:** `supabase/migrations/20260615000003_split_consumption.sql`
- ⚠️ Todo o nada: si cualquier `client_id` es inválido o el monto es 0, se revierte todo.
- El `session_id` que agrupa las filas es generado server-side (DEC-007). No enviarlo desde el cliente.

```typescript
// Request
const { data, error } = await supabase.functions.invoke('split-consumption', {
  body: {
    splits: [
      { client_id: "uuid-1", amount: 1200.00 },
      { client_id: "uuid-2", amount: 1800.00 },
    ],
    total_amount: 3000.00,  // opcional — si se envía, se valida que SUM(splits.amount) coincida
  }
})

// Response 200
{
  "session_id": "uuid",       // agrupa todas las filas en consumptions (DEC-007)
  "splits": [
    {
      "client_id":      "uuid-1",
      "consumption_id": "uuid",
      "points_earned":  12,
      "new_balance":    47
    },
    {
      "client_id":      "uuid-2",
      "consumption_id": "uuid",
      "points_earned":  18,
      "new_balance":    23
    }
  ]
}

// Errores posibles
// 401 { "error": "Unauthorized" }
// 403 { "error": "Forbidden", "code": "insufficient_role" }
// 400 { "error": "Bad request", "code": "insufficient_splits", "detail": "..." }
// 400 { "error": "Bad request", "code": "invalid_client_id" }
// 400 { "error": "Bad request", "code": "invalid_amount", "detail": "..." }
// 400 { "error": "Bad request", "code": "duplicate_client_id" }
// 400 { "error": "Bad request", "code": "amount_mismatch", "sum": N, "expected": M }
// 404 { "error": "client_not_found", "code": "client_not_found" }
// 500 { "error": "Internal server error" }
```

---

### GET /functions/v1/reports

Reportes del panel admin. Devuelve 4 métricas en una sola llamada. Las 4 queries SQL se ejecutan en paralelo.

- **Auth:** Sí — rol `admin` exclusivamente
- **Implementación:** `supabase/functions/reports/index.ts`
- **SQL functions:** `supabase/migrations/20260615000004_report_functions.sql`
- Fechas sin `from`/`to` → defecto: últimos 30 días.
- Fecha de consumos agrupada por día en `settings.timezone` (DEC-005), nunca UTC.

```typescript
// Request — query params
const { data, error } = await supabase.functions.invoke('reports', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  // Pasar params como query string en la URL directamente:
  // /functions/v1/reports?from=2026-06-01&to=2026-06-30&limit=10
})

// Alternativamente, construir la URL con params:
const params = new URLSearchParams({ from: '2026-06-01', to: '2026-06-30', limit: '10' })
const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reports?${params}`,
  { headers: { Authorization: `Bearer ${session.access_token}` } }
)

// Parámetros disponibles:
// ?from=2026-06-01          — ISO date o datetime, inclusive. Default: hoy - 30 días
// ?to=2026-06-30            — ISO date o datetime, exclusive. Default: ahora
// ?limit=10                 — top N para clientes y recompensas. Default 10, max 50

// Response 200
{
  "period": {
    "from":     "2026-06-01T00:00:00.000Z",
    "to":       "2026-06-30T23:59:59.000Z",
    "timezone": "America/Argentina/Buenos_Aires"
  },
  "summary": {
    "total_revenue":         45000.00,
    "total_consumptions":    87,
    "unique_clients":        34,
    "total_points_credited": 870,
    "total_points_redeemed": 350
  },
  "consumptions_by_day": [
    {
      "date":         "2026-06-01",
      "count":        12,
      "total_amount": 18000.00,
      "points_earned": 180
    }
  ],
  "top_clients": [
    {
      "client_id":           "uuid",
      "full_name":           "María García",
      "visit_count":         8,
      "total_spent":         12000.00,
      "total_points_earned": 120
    }
  ],
  "top_rewards": [
    {
      "reward_id":        "uuid",
      "reward_name":      "Café gratis",
      "redemption_count": 15,
      "total_points_used": 750
    }
  ]
}

// Errores posibles
// 401 { "error": "Unauthorized" }
// 403 { "error": "Forbidden", "code": "insufficient_role" }
// 400 { "error": "Bad request", "code": "invalid_date_format" }
// 400 { "error": "Bad request", "code": "invalid_date_range", "detail": "from debe ser anterior a to" }
// 500 { "error": "Internal server error", "code": "db_error" }
```

---

---

### POST /functions/v1/adjust-points

El admin acredita o descuenta puntos manualmente a un cliente. Operación atómica: inserta en `points_transactions` y actualiza `points_balance` en una sola transacción SQL.

- **Auth:** Sí — rol `admin` exclusivamente
- **Implementación:** `supabase/functions/adjust-points/index.ts`
- **SQL function:** `supabase/migrations/20260619000000_adjust_points.sql`
- ⚠️ Crédito: `expires_at` por defecto = now() + 12 meses. Configurable vía param.
- ⚠️ Débito: valida saldo suficiente antes de descontar. Falla con 400 si no alcanza.

```typescript
// Request
const { data, error } = await supabase.functions.invoke('adjust-points', {
  body: {
    client_id:  "uuid",          // obligatorio: UUID del cliente
    points:     50,              // obligatorio: entero ≠ 0. Positivo = crédito, Negativo = débito
    notes:      "Compensación por error en caja",  // opcional: razón del ajuste (auditoría)
    expires_at: "2027-06-19T00:00:00Z",            // opcional: solo aplica a créditos
  }
})

// Response 200
{
  "transaction_id": "uuid",
  "client_id":      "uuid",
  "points":         50,
  "new_balance":    120
}

// Errores posibles
// 401 { "error": "Unauthorized" }
// 403 { "error": "Forbidden", "code": "insufficient_role" }
// 400 { "error": "Bad request", "code": "missing_client_id" }
// 400 { "error": "Bad request", "code": "invalid_points" }           — 0 o no entero
// 400 { "error": "Bad request", "code": "invalid_expires_at" }
// 400 { "error": "insufficient_points", "code": "insufficient_points" }
// 404 { "error": "client_not_found", "code": "client_not_found" }
// 500 { "error": "Internal server error" }
```

---

## Tipos TypeScript para Fran

```typescript
// src/lib/types/index.ts — tipos de dominio (ya generados en database.types.ts)
// Usar directamente los tipos de Database['public']['Tables'][tabla]['Row']

import type { Database } from './database.types'

export type Profile           = Database['public']['Tables']['profiles']['Row']
export type Category          = Database['public']['Tables']['categories']['Row']
export type Product           = Database['public']['Tables']['products']['Row']
export type Promotion         = Database['public']['Tables']['promotions']['Row']
export type TimeOffer         = Database['public']['Tables']['time_offers']['Row']
export type TimeOfferProduct  = Database['public']['Tables']['time_offer_products']['Row']
export type Reward            = Database['public']['Tables']['rewards']['Row']
export type Consumption       = Database['public']['Tables']['consumptions']['Row']
export type PointsBalance     = Database['public']['Tables']['points_balance']['Row']
export type PointsTransaction = Database['public']['Tables']['points_transactions']['Row']
export type Redemption        = Database['public']['Tables']['redemptions']['Row']
export type Settings          = Database['public']['Tables']['settings']['Row']

// Tipos de response de Edge Functions
export type RegisterConsumptionResponse = {
  consumption_id: string
  points_earned:  number
  new_balance:    number
}

export type InitiateRedemptionResponse = {
  redemption_id: string
  code:          string
  expires_at:    string
}

export type ConfirmRedemptionResponse = {
  redemption_id:      string
  client_id:          string
  reward_name:        string
  points_used:        number
  client_new_balance: number
}

export type AdjustPointsResponse = {
  transaction_id: string
  client_id:      string
  points:         number
  new_balance:    number
}
```
