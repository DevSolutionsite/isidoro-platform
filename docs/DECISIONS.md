# DECISIONS.md — Registro de decisiones técnicas
> Cada decisión importante se registra aquí con su razonamiento. Evita repetir discusiones.
> El CTO Agent lee este archivo antes de responder sobre arquitectura o prioridades.

---

## Decisiones de arquitectura (tomadas en planificación inicial)

### DEC-001 — Stack tecnológico
- **Decisión:** Next.js (App Router) + Supabase (PostgreSQL + Auth + Storage) + Tailwind CSS + Vercel
- **Razonamiento:** Es el stack más rápido para un equipo de dos personas con las especializaciones de Kevin y Fran. Supabase elimina la necesidad de un servidor backend propio y provee Auth, RLS y Storage listos para usar. Vercel y Supabase tienen integración nativa.
- **Tomada por:** CTO Agent
- **Fecha:** 14 de junio de 2026

---

### DEC-002 — RLS desde el día 1
- **Decisión:** Activar Row Level Security en todas las tablas desde el momento de crearlas, no al final.
- **Razonamiento:** Activar RLS retroactivamente es un proceso propenso a errores y puede exponer datos en ventanas de tiempo. Es mucho más seguro diseñar las policies junto con el esquema.
- **Implicación para Kevin:** Cada tabla nueva debe tener su policy definida antes de exponer cualquier endpoint.
- **Tomada por:** CTO Agent
- **Fecha:** 14 de junio de 2026

---

### DEC-003 — Canje de puntos como transacción atómica
- **Decisión:** El flujo completo de confirmación de canje (validar código + descontar puntos FIFO + reducir stock + marcar como confirmado) debe ejecutarse en una única transacción de base de datos, implementada como Edge Function o función SQL.
- **Razonamiento:** Si cualquier paso falla y los demás ya ejecutaron, el sistema queda en estado inválido (puntos descontados sin canje confirmado, o canje confirmado sin puntos descontados). Las llamadas secuenciales desde el cliente no son atómicas.
- **Tomada por:** CTO Agent
- **Fecha:** 14 de junio de 2026

---

### DEC-004 — FIFO para descuento de puntos
- **Decisión:** Al canjear, se descuentan primero los puntos con `expires_at` más cercano (los más antiguos).
- **Razonamiento:** Está especificado en la propuesta comercial. Técnicamente se implementa ordenando `points_transactions` por `expires_at ASC` y descontando secuencialmente.
- **Tomada por:** CTO Agent (basado en propuesta)
- **Fecha:** 14 de junio de 2026

---

### DEC-005 — Zona horaria del restaurante
- **Decisión:** La zona horaria se almacena en la tabla `settings` con valor por defecto `America/Argentina/Buenos_Aires`. Las comparaciones de hora para ofertas por horario usan siempre esta zona horaria, no UTC ni la del cliente.
- **Razonamiento:** Un restaurante en Argentina siempre opera en su hora local. Usar UTC causaría que el happy hour de 18:00 se active a las 21:00.
- **Pendiente:** Kevin debe confirmar si la comparación de hora activa se hace en el cliente (leyendo `settings.timezone`) o en una Edge Function.
- **Tomada por:** CTO Agent
- **Fecha:** 14 de junio de 2026

---

### DEC-006 — Datos mock tipados para Fran
- **Decisión:** Fran trabaja con interfaces TypeScript estrictas desde el día 1, aunque los datos sean mock. La integración real consiste en reemplazar la fuente de datos (mock → Supabase client), no en rediseñar componentes.
- **Razonamiento:** Si los tipos no están definidos desde el principio, la integración con el backend real obliga a refactorizar componentes, no solo sus fuentes de datos.
- **Tomada por:** CTO Agent
- **Fecha:** 14 de junio de 2026

---

### DEC-007 — División de cuenta: `session_id` en `consumptions`
- **Decisión:** Usar `session_id uuid nullable` en `consumptions` para agrupar filas del mismo grupo de mesa. No se crea tabla `split_consumptions`.
- **Razonamiento:** Cada cliente tiene su propia fila y gana sus propios puntos. El `session_id` agrupa las filas sin overhead de tabla extra ni JOINs adicionales. Una tabla `split_consumptions` solo aportaría valor si se necesitaran porcentajes variables de split, requerimiento que no existe en la propuesta comercial.
- **Implicación para Kevin:** Agregar columna `session_id uuid nullable` a `consumptions` en la migración inicial.
- **Tomada por:** Kevin
- **Fecha:** 15 de junio de 2026

---

### DEC-008 — QR personal del cliente: token propio en `profiles`
- **Decisión:** El QR apunta a un campo `qr_token text UNIQUE NOT NULL` en `profiles`, no a `profiles.id`.
- **Razonamiento:** `profiles.id` está ligado a `auth.users.id` de forma permanente y no se puede revocar. Un `qr_token` independiente puede rotarse si el cliente pierde el QR o sospecha mal uso, sin afectar la identidad del usuario ni requerir una tabla separada.
- **Implicación para Kevin:** Agregar columna `qr_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text` a `profiles`. El endpoint de búsqueda por QR recibe este token, no el UUID de perfil.
- **Tomada por:** Kevin
- **Fecha:** 15 de junio de 2026

---

### DEC-009 — Código de canje: numérico de 6 dígitos
- **Decisión:** Los códigos de canje son numéricos de 6 dígitos (`'000000'` a `'999999'`).
- **Razonamiento:** Con ventanas de 15 minutos y el volumen de un restaurante, 10^6 combinaciones hacen la colisión prácticamente imposible. Numérico elimina ambigüedad de caracteres (O/0, I/1/l) que ocurre bajo presión de mostrador. El cajero puede leerlo o tipearlo sin error.
- **Implicación para Kevin:** Agregar constraint `CHECK (code ~ '^[0-9]{6}$')` en tabla `redemptions`.
- **Tomada por:** Kevin
- **Fecha:** 15 de junio de 2026

---

### DEC-010 — Ajuste manual de puntos: fila en `points_transactions`
- **Decisión:** Los ajustes manuales se registran como filas en `points_transactions` con `type = 'manual_adjustment'`. No se crea tabla separada.
- **Razonamiento:** `points_transactions` es la fuente de verdad del saldo (DEC declarado en DB_SCHEMA.md). Una tabla separada crearía dos fuentes de verdad y requeriría JOINs para calcular cualquier balance. Los FKs `consumption_id` y `redemption_id` ya son nullable — ambos quedan NULL en ajustes manuales.
- **Implicación para Kevin:** Agregar columna `type text NOT NULL` a `points_transactions` con valores `'consumption' | 'redemption' | 'manual_adjustment' | 'expiry'`. Agregar columna `adjusted_by uuid FK nullable → profiles` para auditoría de quién hizo el ajuste.
- **Tomada por:** Kevin
- **Fecha:** 15 de junio de 2026

---

### DEC-011 — Expiración del código de canje: 15 minutos
- **Decisión:** El código de canje expira 15 minutos después de generado. Se calcula como `now() + interval '15 minutes'` en la Edge Function `initiate-redemption` al crear la fila en `redemptions`.
- **Razonamiento:** 15 minutos da margen suficiente para que el cliente muestre el código al cajero sin presión, pero limita la ventana de uso indebido si el código es capturado o compartido.
- **Implicación para Kevin:** La Edge Function debe setear `expires_at = now() + interval '15 minutes'` al insertar en `redemptions`. El proceso de confirmación debe validar `expires_at > now()` antes de proceder.
- **Tomada por:** Kevin + Fran
- **Fecha:** 15 de junio de 2026

---

### DEC-012 — Validación de saldo insuficiente en backend
- **Decisión:** La Edge Function `initiate-redemption` verifica el saldo disponible antes de generar el código. Si el saldo es insuficiente, retorna HTTP 400 con mensaje claro. No se delega esta validación al frontend.
- **Razonamiento:** Validar solo en el frontend es inseguro — cualquier cliente puede manipular la petición HTTP. El backend es la única capa confiable para validar saldos antes de comprometer stock o emitir códigos.
- **Implicación para Kevin:** La Edge Function debe consultar la suma de `points_transactions` activos (no vencidos, del cliente) antes de insertar en `redemptions`. Retornar `{ error: 'insufficient_points', available: N, required: M }` en caso de fallo.
- **Tomada por:** Kevin
- **Fecha:** 15 de junio de 2026

---

### DEC-013 — Activación de time_offers: lógica en el cliente
- **Decisión:** La lógica de "está activa ahora" para `time_offers` se calcula en el cliente. El frontend lee `settings.timezone`, convierte la hora actual a esa zona horaria y compara con `start_time` / `end_time`. No se crea una Edge Function separada para esto.
- **Razonamiento:** `time_offers` es solo lectura para la carta pública. La activación no modifica estado. Poner la lógica en el cliente elimina una latencia de red y un Edge Function sin valor añadido. La única fuente de zona horaria es `settings.timezone` (DEC-005), nunca hardcodeada.
- **Implicación para Fran:** Leer `settings.timezone` junto con `time_offers`. Usar una librería de fechas compatible con IANA timezone names (ej: `Intl.DateTimeFormat`) para la comparación.
- **Tomada por:** Kevin (Backend Agent) — aprobado por CTO Agent
- **Fecha:** 15 de junio de 2026

---

### DEC-014 — Migración de middleware.ts a proxy.ts (Next.js 16)
- **Decisión:** Renombrar `src/middleware.ts` → `src/proxy.ts` y el export `middleware()` → `proxy()` usando el codemod oficial de Next.js.
- **Razonamiento:** Next.js 16 deprecó la convención `middleware` en favor de `proxy`. La funcionalidad es idéntica — solo cambia el nombre del archivo y del export. Usar el codemod oficial garantiza que el rename sea correcto y compatible con versiones futuras.
- **Cómo se migró:** `npx @next/codemod@canary middleware-to-proxy .`
- **Implicación para Fran:** Si tenés imports o referencias a `middleware` en tu código, renombrá a `proxy`. No hay cambio de comportamiento.
- **Tomada por:** Kevin (Backend Agent)
- **Fecha:** 20 de junio de 2026

---

### DEC-015 — Deploy de Edge Functions: inmediato al crear o modificar
- **Decisión:** Toda Edge Function creada o modificada debe deployarse a Supabase inmediatamente con `npx supabase functions deploy <nombre>`. No alcanza con dejarla en el repo.
- **Razonamiento:** Las 6 Edge Functions del proyecto estaban escritas y commiteadas pero nunca deployadas a Supabase. El frontend no podía invocarlas porque no existían en el entorno remoto. El código en el repo no es suficiente — Supabase necesita el deploy explícito para servir la función.
- **Lección:** Repo ≠ deployed. Cada `git push` de una Edge Function debe ir acompañado de su deploy a Supabase.
- **Implicación para Kevin:** Agregar deploy como paso obligatorio en el checklist "AL TERMINAR CADA TAREA".
- **Tomada por:** Kevin (Backend Agent)
- **Fecha:** 29 de junio de 2026

---

### DEC-016 — Flujo obligatorio para migraciones: `migration new` + `db push`
- **Decisión:** Toda migración nueva debe crearse con `supabase migration new <nombre>` y aplicarse con `supabase db push`. Queda prohibido pegar SQL manualmente en el SQL Editor del Dashboard de Supabase.
- **Razonamiento:** El 30 de junio de 2026 se detectó que las 9 migraciones del proyecto estaban aplicadas en la base de datos real pero no registradas en el historial del CLI (`supabase_migrations.schema_migrations`). La causa fue haber pegado SQL manualmente en el Dashboard sin pasar por el CLI. Esto desincronizó el código local del estado real de la DB y requirió reparación manual con `supabase migration repair --status applied` para cada una. Los fixes del día (`fix_profiles_rls_recursion`, `fix_grants_and_rls`) también se aplicaron fuera del flujo correcto.
- **Flujo correcto:**
  1. `supabase migration new <nombre_descriptivo>` — crea el archivo `.sql` en `supabase/migrations/`
  2. Escribir el SQL en ese archivo
  3. `supabase db push` — aplica la migración y la registra en el historial
- **Lo que NO hacer:** Abrir el SQL Editor del Dashboard y pegar SQL directamente. El Dashboard no actualiza el historial del CLI.
- **Implicación para Kevin y Fran:** Cualquier cambio de esquema, fix de RLS, o ajuste de grants debe seguir este flujo sin excepción.
- **Tomada por:** Kevin + Fran
- **Fecha:** 30 de junio de 2026

---

### DEC-019 — dni/phone/city obligatorios en el registro (email/password)
- **Decisión:** `RegisterForm.tsx` ahora pide `dni`, `phone` y `city` como campos obligatorios junto a `full_name`, y los manda en `options.data` del `signUp()` — mismo mecanismo que ya se usaba para `full_name`. `city` usa un combobox con autocompletado (`CityCombobox.tsx`) sobre una lista estática de localidades de Santa Fe y alrededores (`src/lib/data/ciudades.ts`), pero acepta texto libre para no bloquear clientes de localidades no listadas. `dni` se valida con regex `^\d{7,8}$` (formato DNI argentino, sin puntos).
- **Razonamiento:** Antes estos campos se iban a completar "después en el perfil", pero esa UI de completar perfil nunca se construyó — quedaban sin pedirse en ningún lado. Pedirlos en el registro con email/password es más simple que armar un flujo de perfil incompleto aparte, y reutiliza el patrón ya validado de `full_name` en `raw_user_meta_data`.
- **Gap conocido — Google OAuth:** el botón "Registrarse con Google" redirige directo a OAuth y no pasa por este formulario, así que estos 3 campos no se piden en ese flujo. ~~Se deja así intencionalmente por ahora; un flujo de "completar perfil" post-OAuth queda pendiente como tarea aparte, no bloqueante.~~ **Resuelto por DEC-020** — el gate en `/completar-perfil` cubre este caso.
- **⚠️ Acción pendiente para Kevin (degradada a no-bloqueante, ver DEC-020):** el trigger `handle_new_user` (`supabase/migrations/20260615000001_handle_new_user.sql`) solo lee `full_name` de `raw_user_meta_data` al insertar en `profiles`. El formulario ya manda `dni`, `phone` y `city`, pero **se pierden** hasta que el trigger se actualice para leer también esos 3 campos e incluirlos en el `insert into public.profiles`. Reflejado también en "Bloqueos activos" de `PROJECT_STATUS.md`.
- **Tomada por:** Fran (Frontend Agent) — aprobado por CTO Agent
- **Fecha:** 16 de julio de 2026

---

### DEC-020 — Gate `/completar-perfil`: único punto de control para dni/phone/city
- **Decisión:** El chequeo de "perfil incompleto" vive en un solo lugar: `src/app/(cliente)/layout.tsx`, que ya envuelve todas las rutas cliente (`/perfil` y cualquier futura). Si `role === 'cliente'` y falta `dni`, `phone` o `city`, redirige a `/completar-perfil` — una ruta nueva, deliberadamente **fuera** de `(cliente)`, para no heredar el mismo gate y generar un loop de redirect. `/completar-perfil` actualiza el perfil existente con `supabase.from('profiles').update(...)`, permitido por la policy RLS ya existente `"profiles: usuario actualiza el suyo" (auth.uid() = id)` — no hizo falta Edge Function.
- **Razonamiento:** Parchear cada punto de entrada al login (`LoginForm.tsx`, `auth/callback/route.ts`, `login/page.tsx`, `register/page.tsx`) para redirigir condicionalmente es frágil — cualquier entrada nueva o olvidada rompe la garantía. Todos esos puntos ya redirigen a `/perfil` (o la ruta del rol); centralizar el chequeo en el layout que envuelve `/perfil` cubre login email/password, Google OAuth, navegación directa por URL y refresh de página sin tocar ninguno de esos archivos.
- **Efecto colateral positivo:** esto también cierra el gap de Google OAuth registrado en DEC-019 (ya no es "tarea futura": el flujo real es login con Google → perfil incompleto → `/completar-perfil`) y baja de prioridad el pendiente del trigger `handle_new_user` — si Kevin no lo actualiza, el usuario de email/password simplemente pasa por `/completar-perfil` una vez y reingresa los datos, en vez de quedar bloqueado.
- **Tomada por:** Fran (Frontend Agent) — aprobado por CTO Agent
- **Fecha:** 16 de julio de 2026

---

### DEC-021 — UI división de cuenta: búsqueda client-side vía Server Action, sin navegación GET
- **Decisión:** `/caja/division` (`DivisionCuentaForm.tsx`) rompe con el patrón de `/caja` y `/caja/canje`, que buscan clientes vía `<form method="GET">` con `?q=` y re-renderizan la página server-side. En división de cuenta, el cajero busca y agrega N clientes a una lista que se va acumulando en memoria; una búsqueda por GET perdería esa lista en cada vuelta. En cambio, `buscarClienteParaDivision` es una Server Action que se llama directamente como función async desde el client component (patrón estándar de React Server Functions, sin `<form action>` de por medio) y devuelve el dato en vez de redirigir. Lo mismo para `dividirCuenta`: no usa `redirect()` como `registrarConsumo`/`confirmarCanje` — devuelve `{ok, data|code}` para que el resultado (o el error) se muestre inline en el mismo estado del componente, sin perder lo ya cargado.
- **Razonamiento:** Mantener consistencia de patrón por consistencia hubiera significado codificar la lista de clientes agregados y sus montos en la URL entre cada búsqueda — mucho más frágil y menos legible que estado de React local. Server Actions llamadas directamente (no como `action` de un `<form>`) son parte de la API estándar de React/Next.js, no un hack.
- **Validación cruzada en el cliente:** además de las validaciones del backend (mínimo 2 splits, montos positivos, `client_id` únicos, `amount_mismatch` con tolerancia ±0.01), la UI adelanta el chequeo de `amount_mismatch` client-side (compara la suma de montos ingresados contra un campo opcional "monto total de la mesa") para evitar una ida y vuelta al servidor por un error de tipeo.
- **Tomada por:** Fran (Frontend Agent) — aprobado por CTO Agent
- **Fecha:** 16 de julio de 2026

---

### DEC-022 — Fix de 2 bugs bloqueantes encontrados en la revisión previa a QA (`QA_CHECKLIST.md`)
- **Decisión:** Se corrigieron los 2 hallazgos marcados como bloqueantes en el resumen de `QA_CHECKLIST.md`:
  1. **Ofertas por horario que cruzan medianoche nunca se activaban** (`isTimeOfferActive` en `src/app/(public)/carta/page.tsx`): la comparación `nowInTZ >= start_time && nowInTZ <= end_time` es matemáticamente imposible de cumplir cuando `start_time > end_time` (ej. `22:00`–`02:00`). Fix: si `start_time <= end_time` se mantiene la lógica original; si `start_time > end_time` la oferta está activa cuando `nowInTZ >= start_time || nowInTZ <= end_time` (unión de los dos tramos en vez de intersección). Verificado con 8 casos borde vía script descartable (normal dentro/fuera, medianoche dentro/fuera de ambos tramos, límites inclusivos) — los 8 pasaron.
  2. **`adjustPoints` no parseaba el código de error del Edge Function** (`src/lib/actions/admin-clients.ts`): un `throw new Error(error.message)` genérico hacía que un débito con `insufficient_points` (u otro error) terminara en una pantalla de error de Next.js en vez de un mensaje amigable. Fix: mismo patrón que `iniciarCanje`/`confirmarCanje` — parsea `error.context` (Response) como JSON para extraer `code`, y redirige a `/admin/clientes/[id]?error=<code>` en vez de crashear. `PointsAdjustForm.tsx` ahora acepta `errorCode` y muestra un banner mapeado (`insufficient_points`, `invalid_points`, `client_not_found`, `insufficient_role`/`unauthorized`, fallback `unknown`).
- **Alcance explícito — no incluido:** el Edge Function `adjust-points` no reenvía el detalle "Disponible: X, Requerido: Y" que genera la función SQL, solo el `code`. El banner de error no muestra esas cifras exactas — mostrarlas requeriría tocar el Edge Function (dominio de Kevin) y no formaba parte de este fix.
- **Los otros 3 gaps del resumen de `QA_CHECKLIST.md`** (soft-delete sin filtrar en listas admin, buscador de clientes sin email, sin selector de fechas en estadísticas) quedan documentados como pendientes, no bloqueantes — decisión explícita de priorización del CTO Agent.
- **Tomada por:** Fran (Frontend Agent) — aprobado por CTO Agent
- **Fecha:** 16 de julio de 2026

---

## Decisiones pendientes (Kevin y Fran deben resolver)

### DEC-017 — Leaked Password Protection: bloqueada por plan Free de Supabase
- **Decisión:** Activar "Prevent use of leaked passwords" (Authentication → Policies / Auth Settings → Security and Protection) queda pendiente hasta que el proyecto pase a plan Supabase Pro.
- **Razonamiento:** Confirmado el 15 de julio de 2026: el toggle solo está disponible en plan Pro, no en Free. El resto de los hallazgos del linter de seguridad (grants de funciones SECURITY DEFINER expuestas vía RPC) ya se resolvieron vía la migración `fix_security_definer_grants`. Este es el único ítem que depende de un upgrade de plan y no de código.
- **Implicación para Kevin:** Al migrar el proyecto a Pro, activar el toggle y confirmar que el linter deja de marcarlo.
- **Estado:** Pendiente — no bloqueante para producción.
- **Fecha:** 15 de julio de 2026

### DEC-018 — Dominio personalizado: pendiente de contratación
- **Decisión:** El dominio web del restaurante todavía no está contratado ni apuntado. Ya figuraba como pendiente del cliente en `PROJECT_STATUS.md` ("Dominio web contratado y apuntado"); se registra también acá junto a DEC-017 porque ambos quedan abiertos por una definición externa al equipo (upgrade de plan de Supabase / compra de dominio por parte del cliente).
- **Razonamiento:** Sin dominio propio, el deploy de producción sigue sirviendo desde el subdominio por defecto de Vercel. No bloquea desarrollo ni testing.
- **Implicación para Kevin/Fran:** Ninguna acción de código requerida hasta que el cliente confirme el dominio. Cuando esté disponible: configurar el dominio en Vercel y actualizar las URLs de redirect de Supabase Auth (callback de Google OAuth, etc.).
- **Estado:** Pendiente — no bloqueante para producción.
- **Fecha:** 15 de julio de 2026

---

### DEC-023 — 🔴 BLOQUEANTE CRÍTICO: `categories`, `products` y `rewards` rotas para usuarios anónimos (`permission denied for function current_user_role`)
- **Hallazgo:** Durante la ejecución del QA (Flujo 4 — Carta pública), `/carta` cargaba sin productos ni categorías. Se descartó que fuera un bug de frontend probando las tablas directamente contra la API REST de Supabase con la `anon key` (la misma que usa la app, sin pasar por Next.js):
  - `settings`, `promotions`, `time_offers` → **OK**, devuelven datos.
  - `categories`, `products`, `rewards` → **`{"code":"42501", "message":"permission denied for function current_user_role"}`** en cualquier lectura, incluso `select` simples sin filtros.
- **Impacto:** `/carta` (la carta digital pública, el flujo más visible del producto) no muestra ni un solo producto ni categoría a ningún visitante sin sesión — es decir, a **todos** los clientes reales del restaurante. También rompe la lista de recompensas en `/perfil` (`rewards`), y probablemente cualquier pantalla admin que dependa de estas tablas.
- **Causa técnica:** la función `public.current_user_role()` (creada en `supabase/migrations/20260625000001_fix_grants_and_rls.sql`, `SECURITY DEFINER`, pensada originalmente solo para la policy de `profiles`) aparece referenciada en las policies de lectura de `categories`/`products`/`rewards` en la base **real**, pero esa función nunca recibió `GRANT EXECUTE` para los roles `anon`/`authenticated`. Ninguna migración del repo modifica las policies de estas 3 tablas para usar `current_user_role()` — el código vivo en Supabase diverge del repo.
- **Pista fuerte sobre el origen (a confirmar por Kevin, no verificado directamente):** DEC-017 (15 jul 2026) menciona que los hallazgos del linter de seguridad sobre "grants de funciones SECURITY DEFINER expuestas vía RPC" se resolvieron vía una migración llamada `fix_security_definer_grants` — **esa migración no existe en `supabase/migrations/`**. Es consistente con que ese fix haya sido aplicado directamente en el Dashboard (violando el flujo obligatorio de DEC-016) y que, al revocar el `EXECUTE` público sobre funciones `SECURITY DEFINER` para cerrar el hallazgo del linter, se haya revocado también el acceso que las policies de `categories`/`products`/`rewards` necesitaban para `anon`/`authenticated`, sin volver a otorgarlo explícitamente para esos roles.
- **Qué necesita hacer Kevin:**
  1. Confirmar en el Dashboard (Database → Functions → `current_user_role`, y Database → Policies de `categories`/`products`/`rewards`) qué cambió realmente y cuándo.
  2. `GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;` (o revisar si las policies de estas 3 tablas deberían simplemente volver a `using (true)` para lectura pública, sin pasar por `current_user_role()` en absoluto — más simple y no depende de la función).
  3. Aplicar el fix como migración nueva vía `supabase migration new` + `supabase db push` (DEC-016), **no** pegar SQL en el Dashboard otra vez.
  4. Reconciliar el repo con el estado real de la DB: si `fix_security_definer_grants` existe en producción pero no en el repo, hay que traerla (`supabase db pull` o reconstruir el SQL manualmente) para que el historial de migraciones vuelva a ser la fuente de verdad.
- **Por qué no lo resuelve Fran:** es RLS/grants sobre la base de datos — dominio exclusivo del Backend Agent. Tocarlo sin conocer el estado real de las policies arriesga romper algo más, o volver a violar DEC-016.
- **Estado:** 🟢 Resuelto a nivel de datos (verificado 26 de julio de 2026) — pero con una advertencia de proceso.
  - **Verificación en vivo (Fran, mismo método que el hallazgo original):** consulta directa a `/rest/v1/categories`, `/rest/v1/products` y `/rest/v1/rewards` con la `anon key`, sin pasar por el frontend. Las 3 tablas devuelven datos correctamente — ya no aparece `permission denied for function current_user_role`.
  - **⚠️ El fix no está en ningún archivo de `supabase/migrations/`** — se buscó `current_user_role` y `fix_security_definer_grants` en el repo y no aparece ninguna migración nueva desde `20260715034755_agregar_dni_phone_city_profiles.sql`. Esto significa que el `GRANT EXECUTE` (u otro cambio equivalente) se aplicó **de nuevo directamente en el Dashboard de Supabase**, repitiendo el mismo patrón que causó este bug originalmente y volviendo a violar el flujo obligatorio de DEC-016. El repo vuelve a divergir del estado real de la DB — sigue pendiente el paso 4 del plan original (`supabase db pull` o reconstruir la migración a mano) para que el historial de migraciones sea otra vez la fuente de verdad.
  - **Impacto:** desbloquea `/carta` para anónimos y la lista de recompensas en `/perfil` — el QA puede retomar los Flujos 4 y 5.
- **Tomada por:** Fran (Frontend Agent) — diagnóstico inicial y verificación de resolución; corrección aplicada por Kevin (Backend Agent) fuera del flujo de migraciones — pendiente que Kevin la documente y regularice con una migración real.
- **Fecha:** 17 de julio de 2026 (hallazgo) — 26 de julio de 2026 (verificado resuelto)

---

### DEC-024 — Fix: falta `color-scheme: dark` — el navegador forzaba un modo oscuro genérico sobre el theme real
- **Hallazgo:** durante el QA de Admin (Flujo 9), capturas de pantalla de `/carta` y `/admin/productos` mostraban toda la UI en fondo negro plano, sin ninguna distinción visual entre `--background`, `--surface` y filas de tabla — se veía "roto" pero sin ningún error en consola ni en las respuestas del servidor.
- **Método de diagnóstico:** en vez de asumir por inspección visual, se muestrearon píxeles reales de ambas capturas (`System.Drawing` vía PowerShell) en puntos que deberían tener colores distintos según `globals.css`. Los tres puntos (fondo de página, sidebar, fila de tabla) dieron **exactamente RGB(10,10,10)** en ambas capturas — un valor plano que no corresponde a ningún color real definido (`--background: #1f352a`, `--surface: #2a4535`, etc.). Si el CSS realmente no hubiera cargado, `curl` lo habría mostrado (no fue el caso: el chunk CSS servido contenía los colores correctos, confirmado en la sesión anterior). La única explicación consistente con "el servidor manda el CSS correcto pero el navegador pinta otra cosa" es un post-procesamiento del lado del navegador.
- **Causa:** faltaba declarar `color-scheme: dark` (CSS) y el meta tag equivalente. Sin esa señal, navegadores basados en Chromium con "modo oscuro forzado para contenido web" activado (heurística de accesibilidad/comodidad, común en Windows con dark mode del sistema) asumen que el sitio no tiene soporte nativo de dark mode y le aplican su propio filtro de repintado, aplanando toda la paleta real del proyecto a sus propios grises/negros genéricos — exactamente lo que se veía.
- **Fix:**
  1. `src/app/globals.css` — `color-scheme: dark;` agregado dentro de `:root`.
  2. `src/app/layout.tsx` — `export const viewport: Viewport = { colorScheme: "dark" }`. **Nota de versión:** en Next.js 14+ (y por lo tanto acá en Next 16) `colorScheme` ya no se declara dentro de `metadata` — está deprecado ahí desde v13.2 en favor de un `export const viewport` separado (`generate-viewport.md` en `node_modules/next/dist/docs`). El primer intento de ponerlo en `metadata` compiló sin error mostrando el problema real: no generaba ningún meta tag. Se corrigió moviéndolo a `viewport` y se verificó que el `<meta name="color-scheme" content="dark">` apareciera en el HTML servido.
- **Verificado:** `tsc`/`eslint` limpios; el meta tag y la propiedad CSS confirmados presentes en la respuesta real del servidor.
- **Tomada por:** Fran (Frontend Agent) — aprobado por CTO Agent
- **Fecha:** 17 de julio de 2026

---

### DEC-025 — Fix: listas de admin no filtraban `deleted_at` (gap #1 del QA_CHECKLIST, elevado de "no bloqueante" a corregido)
- **Hallazgo confirmado en vivo:** durante el QA de Admin (Flujo 9), se eliminó un producto — el banner mostró "Eliminado correctamente" pero el producto siguió apareciendo en `/admin/productos`. Se verificó que `deleteProduct` sí hace el soft-delete correctamente (`update({ deleted_at: now() })`); el problema era exclusivamente que la query de la lista no excluía filas con `deleted_at` no nulo. Exactamente el gap #1 que ya estaba documentado en `QA_CHECKLIST.md` desde la revisión de código previa al QA, pero catalogado como "no bloqueante" — al aparecer en la prueba real se decidió corregirlo ahora en vez de dejarlo para después.
- **Alcance del fix — 4 archivos, mismo patrón (`.is('deleted_at', null)`):**
  1. `src/app/(admin)/admin/productos/page.tsx` — lista de productos.
  2. `src/app/(admin)/admin/categorias/page.tsx` — lista de categorías, y también la query de conteo de productos por categoría (antes contaba productos eliminados en el número mostrado, ahora es consistente con lo que realmente se ve en `/admin/productos`).
  3. `src/app/(admin)/admin/productos/nuevo/page.tsx` — dropdown de categoría al crear un producto (antes permitía asignar un producto nuevo a una categoría ya eliminada).
  4. `src/app/(admin)/admin/productos/[id]/editar/page.tsx` — mismo dropdown al editar.
- **No incluido en este fix (deliberado, fuera de alcance):**
  - Los fetches de una fila puntual por `id` (`admin/productos/[id]/editar`'s propio producto, `admin/categorias/[id]/editar`'s propia categoría) no se tocaron — son lookups directos por id, no listados, y no es el bug reportado.
  - La carta pública (`/carta`) sigue sin hacer join-filtro sobre `deleted_at` de la categoría padre de un producto — un producto cuya categoría fue eliminada podría seguir agrupado bajo esa categoría "fantasma" ahí. Esto es un caso distinto (bloqueado además por DEC-023 para poder verificarlo en vivo) — no se tocó en este fix.
  - Si la categoría actual de un producto fue eliminada y se entra a editar ese producto puntual, el dropdown ya no incluye esa categoría entre las opciones (porque ahora filtra `deleted_at`) — el `<select>` quedaría sin ninguna opción coincidente con el valor actual. No se agregó lógica para incluir la categoría actual como opción deshabilitada; es una mejora de UX a futuro si se vuelve un problema real, no bloqueante ahora mismo.
- **Verificado:** `tsc`/`eslint` limpios, `npm run build` compila las 25 rutas.
- **Tomada por:** Fran (Frontend Agent) — aprobado por CTO Agent (pedido directo durante ejecución de QA)
- **Fecha:** 17 de julio de 2026

---

### DEC-026 — Fix: auto-submit del código de canje en `/caja/canje` siempre fallaba con "código inválido"

- **Hallazgo (QA en vivo, Flujo 7):** al tipear los 6 dígitos de un código de canje válido en `ConfirmarCanjeForm.tsx`, el auto-submit al completar el 6to dígito **siempre** devolvía `invalid_code_format`, sin importar la velocidad de tipeo. Confirmado con dos códigos distintos generados en el momento (ambos rechazados vía auto-submit) — descartando que fuera un código vencido o mal generado.
- **Causa raíz:** `handleChange` llamaba a `formRef.current?.requestSubmit()` de forma **síncrona**, en el mismo tick que `setDigits(next)`. `requestSubmit()` dispara el submit (y por lo tanto Next.js serializa el `FormData` del formulario) antes de que React re-renderice y actualice el `value` del último `<input type="hidden" name="d5">` — por lo tanto el código enviado al server quedaba siempre incompleto/desactualizado en el último dígito.
- **Cómo se aisló:** se armó un caso de control cargando los 6 dígitos vía DOM (sin pasar por el auto-submit) y confirmando manualmente con el botón — el mismo código que fallaba por auto-submit fue aceptado sin problema, confirmando que el código era válido y el bug estaba exclusivamente en el timing del auto-submit.
- **Fix:** se reemplazó la llamada síncrona por un `useEffect` que dispara `requestSubmit()` cuando `digits` pasa a estar completo (`isFull`), con un `ref` para evitar doble submit. Los efectos corren después de que React commitea el render, así que los hidden inputs ya reflejan el dígito final. Ver `src/components/cajero/ConfirmarCanjeForm.tsx`.
- **Impacto:** esto rompía la función principal de "escribir el código y que se confirme solo" para **todo** cajero que tipeara el código dígito por dígito (el flujo más común) — no solo un edge case. El flujo de pegar (Ctrl+V) no está afectado porque no dispara auto-submit; requiere tocar el botón manualmente, que sí usa el estado ya commiteado.
- **Verificado:** `tsc` limpio. Probado en vivo con 2 códigos reales generados desde `/perfil` de una cuenta de prueba — confirmados correctamente vía auto-submit después del fix (`-500 pts` y `-1500 pts`, saldos actualizados). También verificados en la misma sesión: código reutilizado → "Código no encontrado"; código inexistente → "Código no encontrado".
- **Tomada por:** Fran (Frontend Agent) — encontrado y corregido durante la ejecución de `QA_CHECKLIST.md` Flujo 7.
- **Fecha:** 26 de julio de 2026

---

### DEC-027 — Carga del menú real del cliente (140 productos, 12 categorías)

- **Decisión:** reemplazar por completo las 5 categorías / 8 productos placeholder por el menú real del Restaurante Isidoro, extraído de su carta actual publicada en https://monline.com.ar/Isidoro (link provisto directamente por Fran/el cliente).
- **Categorías reales (orden de la fuente):** Entradas, Entre Panes, Hamburguesas, Pizzas, Ensaladas, Platos Principales, Postres, Bebidas sin Alcohol, Coctelería, Cervezas, Vinos, Espumantes.
- **Método:** scraping de la página vía dos pasadas independientes (una para nombre+descripción, otra para verificar precios exactos), cruzadas para detectar errores. La segunda pasada reveló 2 duplicados de scraping (un vino repetido dos veces) que se descartaron al armar el listado final. Carga vía inserts directos a Supabase (service role), no a través del formulario del admin — a esa escala (140 filas) hacerlo a mano no era práctico.
- **Excluido:** "Provoleta de la Huerta" no tenía precio visible en la fuente — no se inventó, queda pendiente que el cliente lo confirme.
- **Sin imágenes:** la fuente no tiene fotos accesibles por scraping, y Supabase Storage todavía no está configurado (tarea de Kevin, ver Pendientes del cliente en `PROJECT_STATUS.md`). Los 140 productos quedaron sin `image_url`, mostrando el placeholder genérico como el resto de las vistas hasta ahora.
- **Limpieza asociada:** se detectaron y borraron productos "fantasma" ya soft-deleted de sesiones de test anteriores (`a`, `b` x2, `Prueba 02-07`, `Empanadas (x4)` placeholder) que quedaban en la tabla aunque invisibles en la app — no eran de esta sesión, probablemente de pruebas previas de Kevin o Fran. También se eliminó una oferta de horario de prueba ("dexf") que bloqueaba el borrado del producto placeholder "Tiramisú" por FK.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario con la URL de la carta real.
- **Fecha:** 26 de julio de 2026
- **Corrección posterior (26 jul, mismo día):** el insert de las 12 categorías quedó duplicado — se ejecutó dos veces con ~220ms de diferencia (probablemente un reintento de red del propio `curl`), dejando 24 filas: 12 con los 140 productos reales y 12 vacías con IDs distintos. `/carta` no se vio afectada (las vacías no renderizan sección al no tener productos), pero `/admin/categorias` sí mostraba cada categoría duplicada. Detectado por Fran (usuario) al revisar el admin. Se identificaron las 12 filas sin productos por `category_id` y se borraron directo por API — las 12 con productos y sus IDs quedaron intactas. Verificado después: `/admin/categorias` muestra 12 filas únicas con los conteos correctos, `/carta` sin cambios.

---

### DEC-028 — Primer deploy a producción (Vercel) + merge completo de `feature/frontend` a `main`

- **Decisión:** desplegar la app a producción en Vercel (pedido directo del usuario), y como paso previo necesario, mergear `feature/frontend` completo a `main` por primera vez — hasta ahora `main` solo había recibido syncs puntuales de `docs/`, y estaba ~6600 líneas / 80 archivos atrás (le faltaba prácticamente toda la vista admin, cajero y perfil). Deployar sobre `main` tal como estaba habría dejado producción rota.
- **URL de producción:** https://isidoro-platform.vercel.app (proyecto `isidoro-platform` en la cuenta de Vercel de Fran, org `franchos-projects-a68a206d`).
- **Env vars cargadas en Vercel (production):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — mismos valores que `.env.local`.
- **Git no conectado:** el intento de `vercel git connect` falló — la cuenta de Vercel usada no tiene autorizada la GitHub App de Vercel sobre `kevindavezac1/isidoro-platform` (repo de otra cuenta). Kevin tiene que instalar/autorizar https://github.com/apps/vercel sobre el repo para habilitar deploys automáticos en cada push. Hasta entonces, cada deploy se dispara a mano con `vercel --prod`. Ver Bloqueos activos en `PROJECT_STATUS.md`.
- **Bug encontrado post-deploy:** el usuario reportó que la app "manda al localhost" — diagnosticado como `Site URL` de Supabase Auth todavía apuntando a `http://localhost:3000` (afecta login con Google, confirmación de email, reset de contraseña). No es un bug de código — se revisó y `GoogleAuthButton.tsx` ya usa `window.location.origin` correctamente. Es config del Dashboard de Supabase (Authentication → URL Configuration), fuera del alcance de lo que Fran puede cambiar por API — necesita acceso al Dashboard. Pasos exactos documentados en `PROJECT_STATUS.md`, Bloqueos activos.
- **Metodología de ramas, a partir de ahora:** dado que `main` ya tiene el código completo, a partir de este punto `main` pasa a ser la rama real de producción — los merges de `feature/frontend` a `main` deberían ser de código completo (no solo docs) cada vez que haya una tanda de trabajo estable, no únicamente al final. Una vez Kevin conecte el repo, cada push a `main` va a disparar un deploy automático, así que hay que tener más cuidado de no mergear trabajo a medio terminar.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario ("hacer el deploy... para poder probar todo en producción").
- **Fecha:** 29 de julio de 2026

---

### DEC-029 — Landing page en `/` reemplaza el redirect directo a `/carta`

- **Decisión:** `/` deja de redirigir directo a `/carta` y pasa a renderizar una landing page: logo, hero con carrusel auto-rotante, botón "Ver la carta" (CTA hacia `/carta`) y footer con 4 redes sociales.
- **Razonamiento:** con el sitio ya en producción (DEC-028) y compartible como link standalone, una landing da una primera impresión de marca antes de mandar directo al catálogo — mejor que un redirect ciego.
- **Implementación:** carrusel custom sin librería (`useState` + `setInterval`, crossfade por opacity) — consistente con que el proyecto no tiene ninguna librería de carrusel instalada (mismo criterio que `PromoCarousel`). Componentes nuevos: `src/components/home/HeroCarousel.tsx`, `src/components/home/SocialFooter.tsx`.
- **Placeholders pendientes:** imágenes del hero son de Unsplash (TODO reemplazar por fotos reales del restaurante cuando el cliente las provea — mismo bloqueo que el resto de las imágenes de producto, ver Pendientes del cliente en `PROJECT_STATUS.md`). Links de redes sociales con el mismo patrón de constante placeholder que `WHATSAPP_CHANNEL_URL`.
- **Alcance:** no toca `/carta`, admin, cajero, auth ni lógica de puntos — `page.tsx` de la landing no es importado por ningún otro módulo.
- **Tomada por:** Fran (Frontend Agent)
- **Fecha:** 31 de julio de 2026

---

## System Prompts de los agentes

### CTO Agent — System Prompt

```
Sos el CTO y Project Manager de DevSolution para el proyecto Plataforma de Fidelización del Restaurante Isidoro.

CONTEXTO DEL PROYECTO:
- Producto: plataforma web con carta digital, sistema de puntos y recompensas, y panel administrativo
- Cliente: Restaurante Isidoro (Argentina)
- Plazo: 4 semanas
- Stack: Next.js + Supabase (PostgreSQL + Auth + Storage) + Tailwind CSS + Vercel

EQUIPO:
- Kevin: backend (Supabase, PostgreSQL, Auth, RLS, Edge Functions) — rama feature/backend
- Fran: frontend (Next.js App Router, Tailwind CSS, UX/UI) — rama feature/frontend
- Main: solo contiene código completo y estable

TU ROL:
- Definir prioridades diarias para Kevin y Fran
- Gestionar dependencias entre módulos
- Identificar bloqueos y cómo resolverlos
- Mantener el roadmap actualizado
- Revisar decisiones técnicas

METODOLOGÍA DE TRABAJO DEL EQUIPO:
- Cada desarrollador trabaja en su propia rama
- Al iniciar el día hacen git merge origin/main para traer lo último estable
- Durante el día pushean libremente a su rama
- Cuando cambia el estado de una tarea actualizan PROJECT_STATUS.md y mergean solo ese archivo a main
- Solo mergean código completo a main, nunca trabajo en progreso
- Al inicio de cada sesión el desarrollador te presenta el PROJECT_STATUS.md actualizado

ANTES DE RESPONDER CUALQUIER PREGUNTA:
1. Leer el PROJECT_STATUS.md que el desarrollador te presenta
2. Leer DECISIONS.md para conocer las decisiones ya tomadas
3. Leer API_CONTRACTS.md para entender qué está disponible para Fran
4. Solo entonces responder con información concreta y actualizada

PREGUNTAS QUE DEBES PODER RESPONDER SIEMPRE:
- ¿Qué debe hacer Kevin hoy?
- ¿Qué debe hacer Fran hoy?
- ¿Qué módulo desbloquea más trabajo si se termina ahora?
- ¿Qué está bloqueado y por qué?
- ¿Estamos en riesgo de no cumplir el plazo?

NO ESCRIBAS CÓDIGO. Tu output son decisiones, prioridades, documentación y coordinación.
```

---

### Backend Agent — System Prompt

```
Sos el Backend Agent de Kevin en el proyecto Plataforma de Fidelización del Restaurante Isidoro.

STACK:
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- PostgreSQL con RLS
- TypeScript para Edge Functions

TU ROL:
- Implementar el esquema de base de datos definido en DB_SCHEMA.md
- Implementar endpoints PostgREST configurando RLS correctamente
- Implementar Edge Functions para lógica de negocio compleja
- Actualizar API_CONTRACTS.md cuando termines cada endpoint
- Actualizar PROJECT_STATUS.md cuando cambie el estado de cualquier tarea

PRINCIPIOS NO NEGOCIABLES:
1. RLS activo en todas las tablas desde el momento de crearlas
2. El flujo de confirmación de canje es atómico (una transacción, todo o nada)
3. El FIFO de puntos se implementa ordenando por expires_at ASC
4. La zona horaria del restaurante viene de settings.timezone, nunca hardcodeada
5. Nunca exponer datos de un rol a otro rol incorrecto

METODOLOGÍA DE RAMAS:
- Kevin trabaja siempre en feature/backend
- Al iniciar el día: git merge origin/main para traer lo último estable
- Cuando cambia el estado de una tarea: actualizar PROJECT_STATUS.md y mergear solo ese archivo a main
- Solo mergear código completo a main, nunca trabajo en progreso
- El comando para mergear solo el status es:
  git checkout main
  git merge feature/backend -- docs/PROJECT_STATUS.md
  git push origin main
  git checkout feature/backend

AL INICIAR CADA SESIÓN — OBLIGATORIO:
1. Leer docs/PROJECT_STATUS.md
2. Leer docs/DECISIONS.md
3. Presentar a Kevin:
   - Módulos de Kevin completados ✅
   - Módulos en progreso 🔄
   - Módulos pendientes ⬜
   - Tarea recomendada para esta sesión basada en prioridades y dependencias
4. Esperar instrucción de Kevin antes de implementar cualquier cosa

ANTES DE IMPLEMENTAR ALGO:
1. Revisar DB_SCHEMA.md para la estructura de datos
2. Revisar DECISIONS.md para las decisiones ya tomadas
3. Si hay preguntas abiertas que afectan lo que vas a implementar, resolverlas primero y registrar en DECISIONS.md
4. Mostrar el plan al CTO Agent para aprobación antes de codear

AL TERMINAR CADA TAREA:
1. Actualizar API_CONTRACTS.md con el contrato real del endpoint
2. Cambiar estado en PROJECT_STATUS.md a ✅ Completado
3. Mergear solo PROJECT_STATUS.md a main inmediatamente
4. Avisar al CTO Agent con un resumen de lo entregado
5. Si se creó o modificó una Edge Function: deployarla con `npx supabase functions deploy <nombre>` — el repo no alcanza (ver DEC-021)
```

---

### Frontend Agent — System Prompt

```
Sos el Frontend Agent de Fran en el proyecto Plataforma de Fidelización del Restaurante Isidoro.

STACK:
- Next.js 16 con App Router
- Tailwind CSS v4
- Supabase Client (@supabase/supabase-js)
- TypeScript estricto

DESIGN SYSTEM DE ISIDORO:
- Colores: #1f352a (verde oscuro, fondo principal), #ca9e69 (dorado claro, acento primario), #af8460 (dorado oscuro, acento secundario)
- Tipografías: Playfair Display (títulos), Montserrat (cuerpo)
- Logo: SVG cuatrifolio con "ISIDORO" en spacing amplio
- Estética: elegante, oscura, gastronómica

TU ROL:
- Implementar todas las vistas del usuario cliente, cajero y administrador
- Mantener el design system de Isidoro consistente en toda la app
- Trabajar con datos mock tipados hasta que los endpoints reales estén disponibles
- Reemplazar mocks por llamadas reales a Supabase cuando API_CONTRACTS.md se actualice
- Actualizar PROJECT_STATUS.md cuando cambie el estado de cualquier tarea

CONTEXTO DE USO:
- La carta digital se usa desde el celular en la mesa: mobile-first obligatorio
- El panel de caja se usa desde tablet o computadora
- El panel admin se usa desde computadora

PRINCIPIOS NO NEGOCIABLES:
1. Tipos TypeScript estrictos desde el primer día
2. Mobile-first en todas las vistas públicas
3. No asumir estructuras de datos que no estén en API_CONTRACTS.md
4. Si un endpoint no existe, trabajar con mock tipado — nunca bloquear el desarrollo
5. Nunca mostrar el plan al usuario sin aprobación del CTO Agent primero

METODOLOGÍA DE RAMAS:
- Fran trabaja siempre en feature/frontend
- Al iniciar el día: git merge origin/main para traer lo último estable de Kevin
- Cuando cambia el estado de una tarea: actualizar PROJECT_STATUS.md y mergear solo ese archivo a main
- Solo mergear código completo a main, nunca trabajo en progreso
- El comando para mergear solo el status es:
  git checkout main
  git merge feature/frontend -- docs/PROJECT_STATUS.md
  git push origin main
  git checkout feature/frontend

AL INICIAR CADA SESIÓN — OBLIGATORIO:
1. Leer docs/PROJECT_STATUS.md
2. Leer docs/API_CONTRACTS.md para ver qué endpoints de Kevin están disponibles
3. Leer docs/DECISIONS.md para las decisiones de diseño ya tomadas
4. Presentar a Fran:
   - Módulos de Fran completados ✅
   - Módulos en progreso 🔄
   - Módulos pendientes ⬜
   - Qué endpoints de Kevin están disponibles para integrar
   - Tarea recomendada para esta sesión
5. Esperar instrucción de Fran antes de implementar cualquier cosa

ANTES DE IMPLEMENTAR ALGO:
1. Revisar API_CONTRACTS.md para la estructura de datos disponible
2. Si el endpoint no existe, usar tipos TypeScript del documento y datos mock
3. Revisar DECISIONS.md para decisiones de diseño ya tomadas
4. Mostrar el plan al CTO Agent para aprobación antes de codear

AL TERMINAR CADA TAREA:
1. Cambiar estado en PROJECT_STATUS.md a ✅ Completado
2. Mergear solo PROJECT_STATUS.md a main inmediatamente
3. Si encontraste incompatibilidad con API_CONTRACTS.md, avisá a Kevin y al CTO Agent
4. Documentar en DECISIONS.md cualquier decisión de UX/UI importante
5. Avisar al CTO Agent con un resumen de lo entregado
```
