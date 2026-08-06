# DB_SCHEMA.md — Esquema de base de datos
> ✅ Validado por Kevin — tablas creadas en producción.
> Última actualización: 15 de junio de 2026 — Estado: VIGENTE

---

## Convenciones
- Todas las tablas tienen `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
- Todos los timestamps son `timestamptz` (con zona horaria)
- `created_at` y `updated_at` en todas las tablas
- RLS activo en todas las tablas desde el primer día
- Soft delete con `deleted_at` donde aplique (productos, categorías)

---

## Roles del sistema
Tres roles definidos en Supabase Auth (custom claims o tabla de perfiles):
- `cliente` — usuario registrado del restaurante
- `cajero` — empleado que registra consumos y confirma canjes
- `admin` — administrador total del sistema

---

## Tablas

### `profiles`
Extiende `auth.users` de Supabase. Una fila por usuario registrado.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | Referencia a `auth.users.id` |
| role | text | 'cliente' / 'cajero' / 'admin' — default 'cliente' vía trigger |
| full_name | text | Nombre completo — el frontend siempre lo manda en signup |
| dni | text nullable | Documento de identidad |
| phone | text nullable | Teléfono |
| city | text nullable | Ciudad |
| qr_token | text UNIQUE | Token rotable para QR personal (DEC-008) |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

⚠️ `dni`, `phone` y `city` son **obligatorios a nivel aplicación** para `role='cliente'`, pero quedan `nullable` en DB: el trigger `handle_new_user` crea el perfil sin estos datos en todo signup nuevo (email/password y Google OAuth), y usuarios preexistentes tampoco los tienen cargados. La app debe forzar completar el perfil vía UI — no hay constraint de DB que lo bloquee.

RLS: cada usuario ve solo su propio perfil. Cajero y admin ven todos.

---

### `categories`
Categorías del menú (ej: Entradas, Principales, Bebidas).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| name | text | Nombre visible |
| sort_order | int | Para ordenar en la carta |
| deleted_at | timestamptz nullable | Soft delete |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

RLS: lectura pública. Escritura solo admin.

---

### `products`
Productos del menú.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| category_id | uuid FK → categories | — |
| name | text | — |
| description | text nullable | — |
| price | numeric(10,2) | En pesos ARS |
| image_url | text nullable | URL en Supabase Storage |
| is_available | boolean DEFAULT true | Visible en carta |
| sort_order | int | Orden dentro de categoría |
| deleted_at | timestamptz nullable | Soft delete |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

RLS: lectura pública. Escritura solo admin.

---

### `promotions`
Promociones con fechas de vigencia.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| name | text | — |
| description | text nullable | — |
| valid_from | timestamptz | Inicio de vigencia |
| valid_until | timestamptz | Fin de vigencia |
| is_active | boolean DEFAULT true | Toggle manual |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

RLS: lectura pública. Escritura solo admin.

---

### `time_offers`
Ofertas que se activan automáticamente según horario del día.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| name | text | Ej: "Happy hour" |
| description | text nullable | — |
| start_time | time | Hora de inicio (en TZ del restaurante) |
| end_time | time | Hora de fin |
| is_active | boolean DEFAULT true | Toggle manual del admin |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

⚠️ La zona horaria del restaurante debe definirse como constante en la aplicación o en una tabla `settings`. No hardcodear.

RLS: lectura pública. Escritura solo admin.

---

### `time_offer_products`
Relación N:M entre ofertas y productos.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| time_offer_id | uuid FK → time_offers | — |
| product_id | uuid FK → products | — |

RLS: lectura pública. Escritura solo admin.

---

### `rewards`
Recompensas canjeables por puntos.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| name | text | — |
| description | text nullable | — |
| points_cost | int | Puntos necesarios |
| stock | int nullable | NULL = sin límite |
| is_active | boolean DEFAULT true | — |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

RLS: lectura pública (clientes ven las recompensas). Escritura solo admin.

---

### `consumptions`
Registro de consumos cargados por el cajero.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| client_id | uuid FK → profiles | Cliente que consume |
| cashier_id | uuid FK → profiles | Cajero que registró |
| amount | numeric(10,2) | Monto total del consumo |
| points_earned | int | Puntos acreditados |
| notes | text nullable | — |
| session_id | uuid nullable | Agrupa filas del mismo grupo de mesa (DEC-007) |
| consumed_at | timestamptz | Momento del consumo |
| created_at | timestamptz | — |

RLS: cliente ve solo sus consumos. Cajero y admin ven todos.

---

### `points_balance`
Saldo actual de puntos por cliente. Se actualiza con cada transacción.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| client_id | uuid FK → profiles | Uno por cliente |
| total_points | int DEFAULT 0 | Saldo disponible actual |
| updated_at | timestamptz | — |

RLS: cliente ve solo su balance. Cajero y admin ven todos.

---

### `points_transactions`
Historial completo de movimientos de puntos (acreditaciones y descuentos).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| client_id | uuid FK → profiles | — |
| type | text NOT NULL | 'consumption' / 'redemption' / 'manual_adjustment' / 'expiry' (DEC-010) |
| consumption_id | uuid FK nullable → consumptions | No nulo si type='consumption' |
| redemption_id | uuid FK nullable → redemptions | No nulo si type='redemption' |
| adjusted_by | uuid FK nullable → profiles | No nulo si type='manual_adjustment' — auditoría (DEC-010) |
| points | int | Positivo = acreditación, Negativo = descuento |
| expires_at | timestamptz nullable | Fecha de vencimiento (acreditaciones: +12 meses) |
| created_at | timestamptz | — |

⚠️ Esta tabla es la fuente de verdad del saldo. El FIFO para canje se resuelve ordenando por `expires_at ASC`.

RLS: cliente ve solo sus transacciones. Cajero y admin ven todas.

---

### `redemptions`
Canjes iniciados por el cliente y confirmados por el cajero.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| client_id | uuid FK → profiles | — |
| reward_id | uuid FK → rewards | — |
| cashier_id | uuid FK nullable → profiles | Quien confirma |
| code | char(6) | Código numérico generado al iniciar canje (DEC-009) |
| status | text | 'pending' / 'confirmed' / 'expired' |
| points_used | int | Puntos descontados |
| initiated_at | timestamptz | Cuando el cliente inicia |
| confirmed_at | timestamptz nullable | Cuando el cajero confirma |
| expires_at | timestamptz | now() + 5 minutos (DEC-011, actualizado por DEC-032) |
| created_at | timestamptz | — |

⚠️ La confirmación del canje debe hacerse en una transacción SQL atómica: validar código + descontar puntos + actualizar stock (si aplica) + marcar como confirmed, todo o nada.

RLS: cliente ve sus canjes. Cajero puede confirmar. Admin ve todos.

---

### `settings`
Configuración global del sistema (una sola fila).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | — |
| points_per_peso | numeric(10,4) | Equivalencia puntos/pesos (configurable) |
| timezone | text DEFAULT 'America/Argentina/Buenos_Aires' | Para ofertas por horario |
| updated_at | timestamptz | — |

RLS: lectura pública. Escritura solo admin.

---

## Índices creados en producción
- `idx_points_transactions_client_expires` → `points_transactions(client_id, expires_at)` — FIFO de canje
- `idx_redemptions_code_status` → `redemptions(code, status)` — búsqueda rápida del cajero
- `idx_products_category_available` → `products(category_id, is_available)` — carta pública
- `idx_time_offers_active` → `time_offers(is_active)` — ofertas activas
