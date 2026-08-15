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

### DEC-030 — Sistema de pedidos por WhatsApp desde `/carta`

- **Decisión:** nuevo botón "Hacer un pedido" en el drawer de categorías (debajo de "Hacé tu reserva aquí") abre un modal full-screen con un wizard de 3 pasos: 1) elegir productos (buscador + lista agrupada por categoría con steppers de cantidad), 2) datos del cliente (nombre, modalidad retiro/delivery, dirección condicional, método de pago efectivo/transferencia), 3) confirmación de solo lectura con el pedido armado y botón "Enviar pedido" que abre WhatsApp con el mensaje pre-armado. Público, sin login (mismo criterio que reservas). Especificado con Fran antes de codear — brainstorming + preguntas puntuales sobre entry point (modal full-screen vs drawer vs página nueva → se eligió modal), auth (no requerida) y persistencia del carrito (se resetea al cerrar, sin localStorage).
- **Estado:** vive 100% en memoria del componente (`useState` en `OrderModal`, sin Context API ni store global) — no se persiste nada en Supabase, no se crean filas en ninguna tabla, no requiere sesión. Al cerrar el modal se resetea todo. Si hay productos en el carrito y el usuario intenta cerrar, se pide confirmación (`window.confirm`) para evitar perder el pedido por un toque accidental.
- **Reutilización del número de WhatsApp:** se extrajo `RESTAURANT_WHATSAPP_NUMBER` a `src/lib/constants.ts` — antes vivía hardcodeado dentro de `CategoryMenu.tsx` como parte de la URL de reserva. Ahora reserva y pedido arman cada uno su propio mensaje a partir de la misma constante, sin duplicar el número.
- **Mensaje de WhatsApp:** función pura `buildOrderMessage` (`src/components/carta/order/buildOrderMessage.ts`) arma el texto (productos con cantidad y subtotal, total, nombre, modalidad, dirección solo si es delivery, método de pago) y `buildWhatsAppOrderUrl` arma el link `wa.me` con `encodeURIComponent`. El precio usado por línea es el mismo criterio que ya se muestra en `/carta` (`discount_price ?? price`, ver `ProductCard`).
- **Bug encontrado y corregido durante QA en navegador:** el modal, al ser un descendiente DOM de `<header className="sticky ... z-10">` (que crea su propio stacking context), quedaba **por detrás** del botón flotante "Unite a nuestro canal" (`WhatsAppChannelButton`, `z-10`, hermano del header más adelante en el DOM) pese a tener `z-40` — el `z-index` de un descendiente no compite con elementos fuera del stacking context de su ancestro. Al tocar "Continuar" en el paso 1, el click atravesaba visualmente el modal y abría el link placeholder del canal de WhatsApp en una pestaña nueva. Fix: `OrderModal` se renderiza con `createPortal` directo a `document.body`, escapando el stacking context del header. Verificado en navegador después del fix: el flujo completo (agregar productos → completar datos → confirmar → link de WhatsApp con el mensaje correcto) funciona sin interferencia del botón del canal.
- **Alcance:** no toca `/caja`, admin, `points_transactions`, `consumptions` ni ninguna lógica de puntos existente. Componentes nuevos en `src/components/carta/order/`: `OrderModal.tsx`, `ProductPicker.tsx`, `CustomerForm.tsx`, `OrderReview.tsx`, `buildOrderMessage.ts`. Únicos archivos existentes tocados: `CategoryMenu.tsx` (botón nuevo + reutiliza la constante) y `(public)/carta/page.tsx` (pasa `productsWithDiscount` a `CategoryMenu`).
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario, plan revisado y aprobado antes de codear.
- **Fecha:** 31 de julio de 2026

---

### DEC-031 — Pedidos por WhatsApp: 5 métodos de pago con regla condicional por modalidad + sección admin de contenido de portada

- **Decisión (método de pago):** `OrderCustomerData['payment']` pasa de 2 a 5 valores (`efectivo | transferencia | qr | debito | credito`), con un mapa de labels compartido `PAYMENT_METHOD_LABELS` (en `buildOrderMessage.ts`) usado por `CustomerForm`, `OrderReview` y el mensaje de WhatsApp — reemplaza el ternario de 2 opciones que había en los tres lugares.
- **Layout:** el segmented control de ancho igual (adecuado para 2 opciones) se reemplaza por un grid de 2 columnas: Efectivo/Transferencia, QR (fila completa), Débito/Crédito. Débito y Crédito se agrupan a propósito en la misma fila para que el aviso de restricción aparezca una sola vez debajo de ambas, no repetido.
- **Regla condicional:** con modalidad `delivery`, Débito y Crédito quedan con `disabled` real en el `<button>` (no solo estilo — no disparan `onClick`), `opacity-40` y sin hover, más un texto rojo debajo ("Opción válida únicamente para retiro"). Si el cliente tenía Débito o Crédito seleccionado y cambia la modalidad a Delivery, el `onClick` del botón "Delivery" resetea `payment` a `'efectivo'` en la misma actualización de estado que cambia `modality` — nunca hay un frame con un método inválido seleccionado.
- **Verificado en navegador:** grid con las 5 opciones en Retiro (todas habilitadas), selección de Débito, cambio a Delivery (reset automático a Efectivo + Débito/Crédito grisados + aviso visible), y click en una opción deshabilitada confirmado sin efecto.
- **Alcance:** solo `buildOrderMessage.ts`, `CustomerForm.tsx`, `OrderReview.tsx`. No toca `ProductPicker`, `OrderModal` ni nada fuera del wizard de pedidos.

- **Decisión (sección admin de portada) — planificada, implementación pendiente:** nueva sección `/admin/inicio` para que el admin gestione las imágenes del hero de `/` (reemplazando los placeholders de Unsplash hardcodeados en `HeroCarousel.tsx`) y un texto libre de horarios de atención, mostrado en la landing entre el hero y el `SocialFooter`. Sin soporte de video por ahora (queda para una etapa futura).
- **Modelo de datos:** tabla `site_content` (fila única, mismo patrón que `settings`): `hero_images text[]`, `hours_text text`. Lectura pública, escritura solo admin. Bucket de Storage `hero-images` (mismo patrón que `product-images`): público, 5MB máx, solo png/jpeg/webp, solo admin sube/edita/borra.
- **Bloqueo de acceso encontrado:** Fran no tiene forma de ejecutar DDL (crear tablas, policies) contra el proyecto real de Supabase desde este entorno — el Supabase CLI local está logueado en una cuenta distinta a la de `devsolutions2` (org del proyecto Isidoro), sin project ref linkeado ni contraseña de DB. La carga de datos que Fran hizo antes (140 productos, DEC-027) fue vía `INSERT` por PostgREST con la service role key — eso no requiere DDL y sigue disponible, pero crear tablas/policies sí lo requiere.
- **Resolución:** en vez de que Fran cree la tabla directo (como en DEC-027), se escribió la migración completa en `supabase/migrations/20260805190000_site_content.sql` y el usuario se la pasó a Kevin para correrla en el SQL Editor del Dashboard de Supabase. El frontend de esta sección (Server Actions, data fetch, UI admin, `HeroCarousel` dinámico, horarios en la landing) queda pendiente hasta confirmar que la migración corrió — ver PROJECT_STATUS.md.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario, plan revisado y aprobado antes de codear.
- **Fecha:** 5 de agosto de 2026

---

### DEC-032 — Expiración del código de canje: 5 minutos (supersede DEC-011)
- **Decisión:** El código de canje pasa de expirar a los 15 minutos a expirar a los 5. Se calcula como `now() + 5 * 60 * 1000` ms en la Edge Function `initiate-redemption` al crear la fila en `redemptions`; el `DEFAULT` de la columna `expires_at` se actualiza igual por consistencia, aunque el insert siempre manda el valor explícito.
- **Razonamiento:** surgió de la auditoría de seguridad del sistema de puntos (hallazgo E) — 15 minutos daba una ventana de uso indebido más larga de la necesaria si el código es capturado o compartido. 5 minutos sigue siendo margen suficiente para que el cliente le muestre el código al cajero, y de paso reduce (aunque ya era baja) la probabilidad de colisión del índice único parcial de `redemptions.code` del hallazgo C, al acortar la ventana de códigos `pending` simultáneos.
- **Implicación para Kevin:** redeploy de `initiate-redemption` + aplicar la migración `20260806220018_redemption_code_expiry_5min.sql`. No afecta el frontend — `CodigoCanjeCard.tsx` calcula el countdown dinámicamente desde el `expires_at` que devuelve el server, no tiene el valor hardcodeado.
- **Tomada por:** Fran (Frontend Agent), a pedido del usuario tras confirmar que 5 minutos alcanza para el flujo real de mostrador.
- **Fecha:** 6 de agosto de 2026

---

### DEC-033 — Fix padding en Estadísticas, quitar YouTube de la home, investigación de imágenes "no centradas" en `/carta`

- **Fix 1 — Estadísticas sin padding lateral:** el rediseño de `/admin/estadisticas` (commit `19d8554`, hecho en otra sesión) devolvía `<div className="space-y-8">` como wrapper raíz, sin el `px-8 py-6` que envuelve el contenido en el resto de las páginas del admin (`productos`, `categorías`, `inicio`, `consumos` — las cuatro confirmadas con el mismo patrón). Resultado: las cards de KPIs, el gráfico de facturación y las tablas de top clientes/recompensas quedaban pegadas a los bordes del viewport, sobre todo notorio en pantallas angostas. Fix: agregado `px-8 py-6` al wrapper raíz, igualando el patrón. Cambio de una sola clase, sin verificación visual en navegador (no había credenciales de admin a mano en el entorno de desarrollo local) — confianza alta por tratarse de una comparación directa y mecánica contra 4 páginas ya funcionando en producción con el mismo layout de admin.
- **Fix 2 — Botón de YouTube en la landing:** sacado de `SocialFooter.tsx` (`SOCIAL_LINKS.youtube`, la entrada en `SOCIAL_ITEMS` y el `YouTubeIcon` sin uso). El link nunca se cargó (quedaba en `PENDIENTE_LINK_YOUTUBE`). Quedan WhatsApp, Facebook e Instagram.
- **Investigación sin conclusión — imágenes de `/carta` "no centradas":** el usuario pidió revisar que las imágenes de las cards de `/carta` estén bien centradas ("hay muchas que sí pero algunas no"), aclarando explícitamente que no se refería a las imágenes de la home. Investigación (systematic-debugging): 1) de los 140 productos, solo **uno** (`Ribs de Cerdo`) tiene `image_url` real cargada — el resto muestra el ícono placeholder, confirmado por query directa a `/rest/v1/products?image_url=not.is.null`; 2) esa única foto se ve bien encuadrada en el navegador (verificado a 1536px de ancho); 3) se descartó por evidencia la hipótesis de que las cards más altas (por descripciones largas) desalinearan verticalmente la caja de imagen — medidas las 140 cards vía JS en el DOM real, la altura va de 108 a 119px, una variación de máximo 11px, imperceptible. No se encontró ningún caso reproducible de imagen mal centrada con los datos actuales. **Pendiente:** pedirle al usuario un ejemplo puntual (nombre del producto y/o captura de pantalla) antes de tocar `ProductCard.tsx` — cambiar `object-position` a ciegas sin un caso concreto para verificar contra podría no arreglar nada o incluso empeorar el único caso real que sí funciona bien hoy.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario.
- **Fecha:** 7 de agosto de 2026

---

### DEC-034 — Fix del gap bajo la imagen en `/carta` (con reproducción confirmada) + logo real en navbar/favicon

- **Root cause del gap (DEC-033 quedó sin cerrar):** el usuario pasó una captura de pantalla real del bug, lo que permitió reproducirlo. `ProductCard.tsx` renderiza `<article className="flex gap-3 ...">` — un flex row **sin `items-center`** — con la caja de imagen/placeholder a la izquierda en tamaño fijo (`width: 108, height: 108`). Cuando el `<article>` no tiene `align-items` explícito, el default es `stretch`, pero como la caja de imagen tiene una altura fija (no `auto`), `stretch` no aplica y el ítem se posiciona como si fuera `flex-start` — es decir, pegado arriba. En filas donde la columna de texto empuja la altura del card por encima de 108px (nombre + descripción de 2 líneas + precio + puntos), la caja de imagen queda arriba y aparece una franja vacía del color de fondo de la card debajo — exactamente lo que mostraba la captura. La hipótesis anterior de DEC-033 (que descartaba esto por "solo 11px de variación, imperceptible") estaba equivocada en la conclusión, no en la medición — 11px de franja de un color de fondo distinto al de la caja de imagen (`--surface-alt` vs `--surface`) sí se nota, sobre todo en el caso placeholder donde el contraste de color es más marcado.
- **Fix:** agregado `items-center` al `<article>` — la caja de imagen queda centrada verticalmente en la fila, sin franja visible. Un solo cambio de clase, sin tocar `object-position` ni la lógica de imagen/placeholder (que no tenían el problema).
- **Verificado en navegador:** antes/después contra `Lomo Clásico` (el mismo producto de la captura) — el ícono quedó centrado igual que `La Previa` (que tiene foto real).
- **Logo real:** el usuario proveyó `logo1.png` (marca + wordmark "ISIDORO", para navbar) y `logo2.png` (solo la marca, para favicon) en `docs/`. Antes de integrarlos se verificó que ambos son PNG con transparencia real (renderizados sobre `#1f352a` en una página de prueba local — calzan sin recuadro visible) para no arriesgarse a pegar una imagen con fondo opaco sobre el header de la app.
  - `IsidoroLogo.tsx` (compartido por los 6 navbars: carta, home, admin, cajero, cliente) pasa de un SVG dibujado a mano al `logo1.png` real vía `next/image`, manteniendo la prop `height` existente — no hizo falta tocar ningún caller.
  - Favicon: `logo2.png` copiado a `src/app/icon.png` (convención de Next.js App Router — Next genera el `<link rel="icon">` automáticamente). Se borró el `favicon.ico` default de Next (nunca personalizado desde el scaffold inicial) para que no compita con el ícono nuevo.
  - Los archivos originales (`docs/logo1.png`, `docs/logo2.png`, `docs/image.png` con la captura del bug) se borraron de `docs/` una vez incorporados — ya viven en `public/logo1.png` y `src/app/icon.png`.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario.
- **Fecha:** 7 de agosto de 2026

---

### DEC-035 — Fix: subida de imágenes falla arriba de 1MB pese al límite de 5MB del bucket

- **Síntoma reportado:** un cliente no podía subir imágenes de producto de más de 1MB, aunque el bucket `product-images` está configurado con `file_size_limit: 5242880` (5MB) y la validación client-side de `ProductForm.tsx` también dice 5MB.
- **Diagnóstico:** verificado con evidencia, no supuesto:
  1. Bucket `product-images` en Supabase: consultado en vivo vía Storage Management API (`GET /storage/v1/bucket/product-images`) — `file_size_limit: 5242880`, `updated_at` idéntico a `created_at`, nunca modificado desde la migración `20260730160000_setup_product_images_storage.sql`. Descartado.
  2. Validación client-side en `ProductForm.tsx`: `MAX_IMAGE_BYTES = 5 * 1024 * 1024`, mensaje "La imagen supera el límite de 5MB." — correcta. Descartado.
  3. **Causa real:** Next.js limita el body de una Server Action a **1MB por defecto** (confirmado en `node_modules/next/dist/docs/.../serverActions.md` de la versión instalada, no por memoria — este proyecto corre una versión de Next.js con cambios respecto al conocimiento de entrenamiento, ver `AGENTS.md`). `next.config.ts` no tenía `experimental.serverActions.bodySizeLimit` configurado. `createProduct`/`updateProduct` (`src/lib/actions/admin-products.ts`) son Server Actions reales invocadas vía `<form action={formAction}>` en `ProductForm.tsx` — el archivo viaja como parte del `FormData` del body de la Server Action, así que una imagen de más de 1MB choca contra el límite del framework **antes** de llegar al chequeo de 5MB del código o a Supabase Storage.
  - Mismo patrón (mismo bug latente) encontrado en `src/lib/actions/admin-site-content.ts` (subida de imágenes del hero en `/admin/inicio`) — no reportado por el cliente, pero mismo root cause.
- **Fix:** agregado `experimental.serverActions.bodySizeLimit: '6mb'` en `next.config.ts` — 1MB de colchón sobre el límite real de 5MB de las imágenes, para no quedar exactos al límite. Cambio de una sola config, sin tocar `ProductForm.tsx`, `admin-products.ts` ni `admin-site-content.ts` (ya estaban bien). Corrige ambos flujos de subida (productos y hero) con un solo cambio, al ser una config a nivel de framework.
- **Tomada por:** Fran (Frontend Agent) — diagnóstico y fix a pedido directo del usuario.
- **Fecha:** 8 de agosto de 2026

---

### DEC-036 — Pedidos del cliente en reunión del 8 de agosto (pendientes, sin implementar)

- **Contexto:** reunión con el Restaurante Isidoro. El cliente está conforme con el sistema en general y pidió 5 funcionalidades nuevas. Se registran acá tal cual fueron pedidas, en el orden de prioridad que dio el cliente, **antes** de empezar a implementar ninguna — sirven de trazabilidad del pedido, no son decisiones de diseño todavía (esas se agregan por separado a medida que se resuelve cada una).
- **Fuera de alcance de Fran:** el envío de mails con promociones lo maneja Kevin del lado de infraestructura — no forma parte de esta lista de trabajo de frontend.

1. **Subcategorías** — organizar productos en subcategorías dentro de cada categoría (ej: dentro de "Bebidas" → Gaseosas, Vinos, Cervezas).
2. **Puntos automáticos al 10% de la compra** — verificar si `settings.points_per_peso` ya está en el valor correcto (0.1) o si hay que ajustarlo, y confirmar si el cliente puede cambiarlo desde el admin o si hay que agregar esa UI.
3. **Sección aparte para cargar recompensas manualmente** — a confirmar primero: si ya existe gestión de `rewards` en el admin, o si nunca se armó esa UI y el pedido es una sección nueva.
4. **Admin puede designar o dar de baja roles** (cajero/admin/cliente) — hoy el rol solo se asigna por SQL directo; armar UI en el admin para cambiar el rol de cualquier usuario.
5. **Activar/desactivar categorías y subcategorías** — agregar toggle `is_active` (o el patrón equivalente ya usado en otras tablas) para categorías, y para las subcategorías del punto 1.

- **Método de trabajo:** se resuelven de a una, en el orden de arriba, no todas juntas. Cada una se documenta con su propia entrada en `DECISIONS.md` al implementarse (o al confirmarse que no hace falta implementar nada, como puede pasar con el punto 3).
- **Tomada por:** Fran (Frontend Agent) — registrado a pedido directo del usuario, previo a cualquier implementación.
- **Fecha:** 8 de agosto de 2026

---

### DEC-037 — Gestión de recompensas en el admin: nueva sección `/admin/recompensas` (cierra el punto 3 de DEC-036)

- **Confirmado antes de codear:** nunca existió gestión de `rewards` en el admin — ni combinada con otra sección ni separada. Solo aparecía en 2 lugares de solo lectura: `RewardsList.tsx` (cliente, `/perfil`) y `TopRecompensasTable.tsx` (estadísticas). No había ruta, ni link en `AdminNav.tsx`, ni Server Actions (`admin-rewards.ts` no existía). El pedido del cliente es una sección enteramente nueva.
- **Verificación en vivo de RLS antes de codear:** en vez de asumir que la escritura de `rewards` funcionaba igual que `products`/`categories` por tener la misma policy en el código fuente, se verificó con una request real: login como admin real (`kevindavezac22@gmail.com`, rol confirmado por query a `profiles`) vía `/auth/v1/token` con la `anon key`, y un POST + PATCH + DELETE de una fila de prueba contra `rewards` en producción — los 3 devolvieron 200/201 sin que Kevin tocara nada de RLS. La fila de prueba se borró en el mismo test. (Se descartó usar `service_role` para esto porque esa key bypassea RLS por completo — no hubiera probado nada sobre si un admin real puede escribir.)
- **Patrón elegido:** se siguió `admin/promociones`, no `admin/productos` — porque `rewards` no tiene `deleted_at` (solo `is_active`, igual que `promotions`). "Eliminar" es `update({ is_active: false })`, no un soft-delete con columna propia. Sin subida de imágenes ni `useActionState`, a diferencia de productos.
- **Archivos nuevos:** `src/lib/actions/admin-rewards.ts` (`createReward`, `updateReward`, `deleteReward`), `src/components/admin/RewardForm.tsx`, `src/app/(admin)/admin/recompensas/{page.tsx,nueva/page.tsx,[id]/editar/page.tsx}`.
- **Archivo editado:** `src/components/admin/AdminNav.tsx` — link "Recompensas" agregado después de "Ofertas por horario", agrupado con el resto de gestión de catálogo/contenido.
- **Campos:** los 5 que ya tiene la tabla (`name`, `description`, `points_cost`, `stock`, `is_active`). `points_cost` validado `> 0` (constraint de DB), `stock` opcional (`null` = sin límite, validado `>= 0` si se completa). Listado ordenado por `points_cost ascending`, mismo orden que ya ve el cliente en `/perfil` según `API_CONTRACTS.md`.
- **Verificado después de codear:** `tsc --noEmit` y `eslint` limpios, `next build` compila las 3 rutas nuevas (28 rutas totales). Probado end-to-end en el navegador contra producción, logueado como el mismo admin: crear recompensa de prueba (banner "Creado correctamente"), editarla (banner "Actualizado correctamente"), desactivarla (banner "Eliminado correctamente", pill pasa a "Inactiva"), y borrado permanente de la fila de prueba por API para no dejar datos falsos en la tabla real. Los 6 recompensas reales del cliente (Café gratis, Postre de cortesía, Copa de vino, Entrada gratis, Descuento 20%, Cena para dos) se mostraron sin alteración durante toda la prueba.
- **Documentación actualizada:** `API_CONTRACTS.md` — agregado el contrato de escritura de `rewards` (POST/PATCH), que Kevin nunca había documentado.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario, plan revisado y aprobado antes de codear.
- **Fecha:** 8 de agosto de 2026

---

### DEC-038 — `points_per_peso` ajustado a 0.1 (10% de la compra) + UI nueva en `/admin/inicio` (cierra el punto 2 de DEC-036)

- **Estado encontrado:** `settings.points_per_peso` estaba en `1.0` (1 punto por peso = 100%, no 10%) desde la migración inicial. No había ningún campo editable para este valor en el admin — `/admin/inicio` solo exponía `max_consumption_amount`. El valor se lee en 3 lugares (`(cajero)/caja/page.tsx`, `(cajero)/caja/division/page.tsx`, `(public)/carta/page.tsx` para el preview de puntos) y se usa server-side en las funciones SQL atómicas (`register_consumption`, `split_consumption`) — no hacía falta ningún cambio de Kevin, es un valor de configuración, no de esquema.
- **Fix:** agregada `updatePointsPerPeso` en `admin-settings.ts` (mismo patrón que `updateMaxConsumptionAmount`: valida `> 0`, `redirect` con `?error=` si falla) y una sección nueva en `/admin/inicio` con input numérico (`step="0.0001"`, coherente con `numeric(10,4)` de la columna). Se usó la UI nueva para hacer el cambio real a `0.1` (no un `UPDATE` directo) — verificado end-to-end en el navegador (banner "Actualizado correctamente", valor `0.1` persistido) y confirmado por lectura directa a `/rest/v1/settings` después.
- **⚠️ Nota de comportamiento a tener en cuenta (no es un bug, es aritmética):** `register_consumption`/`split_consumption` calculan `floor(amount * points_per_peso)::int`. Con `0.1`, cualquier consumo menor a $10 acredita **0 puntos** (antes, con `1.0`, cualquier consumo entero acreditaba al menos 1 punto). Es el comportamiento esperado de "10% en puntos enteros", pero vale la pena que el cliente lo sepa si tiene productos de bajo valor (ej: un café de $8 no acreditaría puntos).
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario.
- **Fecha:** 8 de agosto de 2026

---

### DEC-039 — Subcategorías: diseño e implementación completa (opción A), cierra el punto 1 de DEC-036

- **Confirmado antes de escribir nada:** `categories` no tenía ningún campo de jerarquía en ningún lado (`DB_SCHEMA.md`, `initial_schema.sql`, tipos generados, ni ninguna de las 22 migraciones del repo). Subcategorías requiere cambio de esquema — no se puede resolver solo en frontend.
- **Opción elegida (A) — auto-referencia en `categories`, sin tabla nueva:** `categories.parent_category_id uuid nullable references categories(id)`. Una subcategoría es una fila de `categories` con padre. `products.category_id` no cambia de significado ni de tipo — sigue apuntando a la fila "hoja" (la subcategoría, si el producto pertenece a una; la categoría de nivel superior, si no).
  - **Por qué esta opción y no una tabla `subcategories` separada:** reutiliza toda la tabla, RLS y CRUD de `categories` tal cual (mismas policies "lectura pública" / "escritura solo admin", sin duplicar nada), y no rompe la relación `products.category_id` existente en los 140 productos ya cargados — ningún dato existente se toca.
  - **Asunción de diseño — 2 niveles fijos, no N niveles arbitrarios:** así lo pidió el cliente (ejemplo: Bebidas → Gaseosas/Vinos/Cervezas) y así lo va a consumir el frontend. El único guardrail a nivel de DB es un `check (id <> parent_category_id)` (evita que una fila sea padre de sí misma). **No hay trigger que impida un tercer nivel** (subcategoría-de-subcategoría) — queda garantizado por el frontend: el selector de "categoría padre" en `CategoryForm` solo va a listar categorías con `parent_category_id is null`, así que nunca va a ser posible elegir una subcategoría como padre de otra. Si en el futuro alguien inserta un tercer nivel directo por API (no por la UI), no hay nada en la DB que lo bloquee — riesgo aceptado, documentado acá, no bloqueante para el pedido actual.
- **Migración escrita, pendiente que Kevin la corra:** `supabase/migrations/20260808230000_categories_parent_id.sql` — mismo bloqueo de acceso que DEC-031 (el CLI local de Fran no tiene project ref linkeado al proyecto real). El frontend (gestión de subcategorías en `/admin/categorias`, agrupación en `/carta`, selector de categoría en `ProductForm`) queda planificado pero **no se implementa hasta confirmar que la migración corrió** — mismo criterio que DEC-031 con `site_content`.
- **✅ Migración corrida por Kevin, verificada en vivo por Fran el 10 de agosto de 2026 (no se asumió por su palabra):**
  1. `GET /rest/v1/categories?select=id,name,parent_category_id` — la columna existe y responde (antes hubiera dado `400 column does not exist`).
  2. Intento de auto-referencia (`PATCH` de una categoría con `parent_category_id` = su propio `id`, autenticada como admin real) — rechazado con `23514 violates check constraint "categories_parent_not_self"`, el nombre exacto del constraint de la migración. Confirma que no se aplicó una versión distinta o simplificada.
  3. Asignación real de padre entre 2 categorías existentes (`Vinos` como padre de `Bebidas`) — `200 OK`, y revertida a `null` en el mismo test para no dejar cambios de prueba en datos reales.
  - Con esto el punto 1 de DEC-036 queda desbloqueado para implementación de frontend.
- **✅ Frontend implementado y verificado en el navegador el 10 de agosto de 2026, siguiendo el plan ya aprobado:**
  - `admin-categories.ts` (`createCategory`/`updateCategory`) — agregado `parent_category_id` al insert/update.
  - `CategoryForm.tsx` — campo nuevo "Categoría padre" (`<select>`), listando solo categorías con `parent_category_id is null` (nunca ofrece una subcategoría como padre, así se garantiza el límite de 2 niveles desde la UI). En edición, excluye la propia categoría de las opciones.
  - `/admin/categorias` (listado) — filas de nivel superior con sus subcategorías indentadas debajo (`— Nombre`), conteo de "Productos" en la fila padre = propios + de todas sus subcategorías (para que coincida con lo que el cliente ve agrupado en `/carta`). Link "+ Subcategoría" por fila padre → `/admin/categorias/nueva?parent=<id>` con el padre pre-seleccionado.
  - `getCachedCategories` (`src/lib/data/categories.ts`) — trae `parent_category_id` además de `id, name`.
  - `ProductForm.tsx` (selector de categoría) — categorías sin subcategorías se muestran igual que siempre (`<option>` suelta); categorías con subcategorías se agrupan en `<optgroup>` con una opción "(sin subcategoría)" primero, por si un producto no encaja en ninguna.
  - `/carta` — cada categoría de nivel superior sigue siendo un `<section>`/`<h2>`; adentro, primero los productos asignados directo al padre (sin subtítulo, igual que antes), después cada subcategoría con `<h3>` y sus productos. El anchor de navegación se mantiene a nivel de categoría padre únicamente.
  - `CategoryMenu.tsx` (drawer de navegación) — filtra a solo categorías de nivel superior para la lista de botones; sigue recibiendo y reenviando la lista completa (con subcategorías) a `OrderModal`/`ProductPicker` sin cambios ahí, porque ese componente ya agrupaba por cualquier fila de `categories` que se le pasara — una subcategoría es, para ese widget, una fila más, sin necesidad de tocar su código.
  - Tipos: `database.types.ts` (`categories.Row/Insert/Update`) actualizado a mano con `parent_category_id: string | null` — no se pudo regenerar con `supabase gen types` (mismo bloqueo de CLI sin project ref).
  - **Verificado en el navegador** (no solo `tsc`/`eslint`/`build`, los 3 limpios): creada "Bebidas" con subcategorías "Gaseosas"/"Vinos" por API + "Cervezas" a través del formulario real (`+ Subcategoría` → padre pre-seleccionado → alta → aparece indentada); `/admin/categorias` mostró el conteo agregado correcto (Bebidas: 3 = 1 directo + 1 Gaseosas + 1 Vinos); selector de `ProductForm` mostró el `<optgroup>` esperado; `/carta` agrupó correctamente (Entradas plano, Bebidas con "Agua mineral" directo + subtítulos "Gaseosas"/"Vinos", "Cervezas" sin productos correctamente omitida); drawer de navegación mostró solo "Entradas"/"Bebidas", sin las subcategorías.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario, opción A confirmada por el usuario antes de escribir la migración, implementación aprobada y verificada en el navegador.
- **Fecha:** 8 de agosto de 2026 (migración escrita) — 10 de agosto de 2026 (migración verificada corrida + frontend implementado y verificado)

---

### DEC-040 — `categories` y `products` vaciadas intencionalmente el 10 de agosto de 2026 — el sistema no está lanzado al público real

- **Hallazgo:** al retomar el trabajo de subcategorías, Fran encontró `categories` y `products` completamente vacías en producción (`Content-Range: */0` vía REST, confirmado contra la URL real de Supabase, no solo localhost) — los 140 productos y 12 categorías reales del cliente (cargados en DEC-027) habían desaparecido. Se descartó que fuera un problema de permisos/RLS (a diferencia de DEC-023): dos policies estructuralmente distintas de `categories` (lectura pública filtrando por `deleted_at`, y "escritura solo admin" sin ese filtro) daban ambas 0 filas, y `rewards`/`profiles` — mismo patrón de RLS — seguían funcionando con datos reales. Fran se detuvo y avisó antes de seguir.
- **Aclaración del usuario:** el borrado fue **intencional** — el sistema todavía no está lanzado al público real, así que no hay problema. El usuario autorizó crear categorías y productos de prueba libremente para seguir desarrollando.
- **⚠️ Contradice el estado documentado hasta ahora:** `PROJECT_STATUS.md` y varias decisiones anteriores (DEC-027, DEC-028) describen el sitio como "en producción", con deploy real (29 jul) y 140 productos reales extraídos de la carta del cliente (26 jul). Esa descripción ya no refleja el estado actual de los datos — se actualiza `PROJECT_STATUS.md` en consecuencia (quita la afirmación de "140 productos reales cargados" como estado vigente, la dejaría como hecho histórico). El deploy de Vercel y la infraestructura siguen existiendo tal como se documentó; lo que cambió es el contenido de las tablas.
- **Implicación para sesiones futuras:** los datos que se vean en `categories`/`products` a partir de ahora (incluyendo los de prueba creados para verificar subcategorías, ver DEC-039) no son el catálogo real del cliente. No asumir que un conteo bajo de filas es un bug — confirmar con el usuario antes de alarmarse o de intentar "recuperar" datos.
- **Tomada por:** Fran (Frontend Agent) — hallazgo propio, aclarado por el usuario.
- **Fecha:** 10 de agosto de 2026

---

### DEC-041 — `/admin/usuarios`: admin puede cambiar el rol de cualquier usuario (cierra el punto 4 de DEC-036)

- **Confirmado antes de codear:** no hacía falta ningún cambio de esquema ni de RLS. La policy `"profiles: admin actualiza cualquiera"` (`for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))`) ya existía desde `initial_schema.sql` y nunca se había usado desde el frontend — verificado en vivo (no asumido): login como admin real, `PATCH` del rol de una cuenta de prueba (`cliente` → `cajero` → `cliente`), ambos `200 OK`.
- **Diseño:** nueva sección `/admin/usuarios`, no reutiliza `/admin/clientes` porque esa página filtra explícitamente `role = 'cliente'` y este pedido es sobre "cualquier usuario". Vista por defecto: solo staff actual (`role in ('cajero','admin')`) — la lista relevante del día a día, chica. Con búsqueda (reutiliza `ClientSearch.tsx` tal cual, por nombre/teléfono): cualquier perfil sin importar el rol, para poder ascender un cliente puntual sin tener que listar todos los clientes registrados.
- **Cambio de rol inline:** `UserRoleForm.tsx` — un `<select>` por fila dentro de su propio `<form>`, con un botón "Guardar" que solo aparece si el valor difiere del rol actual (evita submits accidentales al simplemente abrir el dropdown).
- **Guardrail — un admin no puede cambiarse el rol a sí mismo desde esta pantalla:** ni en la UI (su propia fila muestra el rol como texto plano "role (vos)", sin selector) ni en el servidor (`updateUserRole` compara `userId` contra `auth.getUser()` y redirige con error si coinciden, aunque alguien arme el request a mano). Sin esto, un admin podría autodegradarse a `cliente` por error y perder acceso al panel. No se agregó protección contra "dejar la plataforma sin ningún admin" (ej: degradar al último admin restante) — riesgo aceptado, no pedido por el cliente, hay 3 cuentas admin activas hoy.
- **Verificado en el navegador:** vista de staff (3 admins + 1 cajero), fila propia sin selector, cambio de rol de una cuenta de prueba (`cliente ⇄ cajero`) con banner "Actualizado correctamente" y la fila apareciendo/desapareciendo del listado por defecto según corresponda, búsqueda por nombre encontrando cualquier perfil.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario.
- **Fecha:** 10 de agosto de 2026

---

### DEC-042 — `categories.is_active`: migración escrita para Kevin (punto 5 de DEC-036, en curso)

- **Confirmado antes de escribir nada:** `categories` no tiene `is_active` — verificado en vivo (`GET /rest/v1/categories?select=is_active` devuelve `42703 column categories.is_active does not exist`). Requiere cambio de esquema, mismo bloqueo de acceso DDL que DEC-031/DEC-039 (Fran no puede correr migraciones).
- **Diseño — mismo patrón que `products.is_available`/`promotions.is_active`:** columna `is_active boolean not null default true`, independiente de `deleted_at`. Con `is_active = false` la categoría sigue existiendo y siendo editable en `/admin/categorias`, pero se oculta de `/carta` — a diferencia de `deleted_at`, que la saca de todos lados. Como una subcategoría es una fila más de `categories` (DEC-039), la misma columna cubre "categorías y subcategorías" sin ningún trabajo adicional de esquema.
- **Migración escrita, pendiente que Kevin la corra:** `supabase/migrations/20260810180000_categories_is_active.sql`. **El frontend correspondiente (checkbox "Activa" en `CategoryForm`, pill de estado en `/admin/categorias`, filtro en `/carta` y en `CategoryMenu`) todavía no se implementó** — a diferencia de trabajos anteriores donde a veces se adelantó el tipo TypeScript a mano, acá se decidió esperar la confirmación de Kevin antes de tocar código, porque un filtro `.filter(c => c.is_active)` contra una columna que todavía no existe en la DB real haría que `is_active` llegue `undefined` en cada fila (PostgREST con `select('*')` simplemente omite la clave si no existe) — `undefined` es falsy, así que **ocultaría todas las categorías de `/carta`** hasta que la migración corra. Mismo criterio de precaución que DEC-031/DEC-039, esta vez explícito por el riesgo concreto de romper el filtrado si se adelanta.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario.
- **Fecha:** 10 de agosto de 2026

---

### DEC-043 — Hardening de `updateUserRole`: chequeo explícito de admin, no confiar solo en RLS

- **Hallazgo (revisión de seguridad automática sobre el commit de DEC-041):** `updateUserRole` (`admin-users.ts`) no verificaba explícitamente que quien invoca la acción fuera admin — dependía enteramente de la policy RLS `"profiles: admin actualiza cualquiera"` para bloquear la escritura. Problema concreto: los Server Actions de Next.js son endpoints propios, invocables directamente sin pasar por la página que los renderiza — el gate de `(admin)/layout.tsx` (que redirige a `/login` si `role !== 'admin'`) no protege la acción en sí. Además, si RLS bloquea un `update` sin devolver `error` (0 filas afectadas), el código original igual redirigía a `?success=updated`, mostrando un éxito falso.
- **Qué NO era un agujero real (verificado, no asumido):** un cliente no podía escalar su propio rol a través de esta acción — el guard explícito `if (user.id === userId) redirect(...)` (agregado en DEC-041 para evitar que un admin se autodegrade) también bloqueaba de paso la auto-escalación. Y no podía cambiar el rol de otro usuario porque la policy `"profiles: admin actualiza cualquiera"` sigue exigiendo `role = 'admin'` del lado de quien llama. Es decir: la escritura real a la DB siempre estuvo protegida por RLS. Lo que faltaba era defensa en profundidad + evitar el mensaje de éxito engañoso.
- **Fix:** antes de intentar el `update`, se agregó una consulta explícita a `profiles` para confirmar `role === 'admin'` del usuario autenticado, con `redirect('/login')` si no lo es. Además, el `update` ahora usa `.select('id')` y se verifica que `data` tenga al menos una fila — si RLS lo bloqueó silenciosamente, se lanza un error real en vez de reportar éxito.
- **Nota — mismo patrón débil existe en el resto de `admin-*.ts`:** ninguna otra Server Action del admin (productos, categorías, promociones, recompensas, etc.) hace este chequeo explícito tampoco, todas dependen solo de RLS. Se decidió priorizar el fix únicamente acá porque `updateUserRole` es la única acción que es una escalación de privilegios (cambia quién tiene acceso a qué) — las demás, en el peor caso de un bypass del layout, exponen datos de catálogo (precio de un producto, nombre de una categoría), no acceso al sistema. Extender el mismo patrón al resto queda como mejora de hardening general, no bloqueante, no pedida por el cliente.
- **Verificado en el navegador después del fix:** cambio de rol real (`cajero ⇄ cliente` sobre la cuenta de prueba "DevSolution") sigue funcionando con el chequeo nuevo, banner "Actualizado correctamente" correcto, cuenta revertida a su rol original.
- **Tomada por:** Fran (Frontend Agent) — hallazgo de la revisión de seguridad automática del commit, corregido antes de pushear.
- **Fecha:** 10 de agosto de 2026

---

### DEC-044 — Frontend de `categories.is_active` conectado: toggle en admin + filtro en `/carta` (cierra el punto 5 de DEC-036, cierra DEC-042)

- **Contexto:** DEC-042 dejó escrita la migración de `is_active` pero deliberadamente sin conectar del lado del frontend, a la espera de que Kevin la corriera en producción (riesgo concreto: filtrar contra una columna inexistente hubiera ocultado toda la carta). Kevin confirmó que ya la corrió — se procede a conectar el resto.
- **Diseño:**
  - **Sin cascada entre niveles:** desactivar una categoría de nivel superior NO oculta a sus subcategorías activas — cada fila decide su propia visibilidad de forma independiente. Si una subcategoría queda "huérfana visible" (activa, con el padre inactivo), se renderiza como su propia sección de nivel superior en `/carta`, sin el título del padre.
  - **Cruce con delivery:** un producto solo es elegible para pedido por WhatsApp si, además de lo que ya exigía `available_for_delivery` (con su cascada existente al padre, sin cambios), su categoría propia tiene `is_active = true` — sin cascada al padre, mismo criterio de independencia que en `/carta`.
- **Archivos nuevos:** `src/components/admin/CategoryActiveToggle.tsx`.
- **Archivos editados:** `src/lib/types/database.types.ts` (tipo `categories` con `is_active`, faltante desde que se corrió la migración de DEC-042), `src/lib/actions/admin-categories.ts` (`toggleCategoryActive`), `src/app/(admin)/admin/categorias/page.tsx` (columna "Activo"), `src/app/(public)/carta/page.tsx` (`visibleCategories` con promoción de huérfanas, usado en el render principal y pasado a `CategoryMenu`/`ProductPicker` sin tocar el código de esos dos componentes; `isDeliveryEligible` extendido).
- **Gap de infraestructura encontrado (no introducido por este trabajo):** los deploys de Preview de este proyecto nunca funcionaron — las 6 variables de entorno de Supabase/Google están cargadas en Vercel solo para el ambiente "Production", no para "Preview" (`vercel env ls` lo confirma). Un intento de probar este cambio en un deploy de preview falló en build con `supabaseUrl is required`. Tampoco sirvió `npm run dev` local como alternativa: el login con Google redirige según la Site URL configurada en Supabase Auth, que apunta a producción, no a `localhost:3000`. Ninguno de los dos es un problema de este cambio — quedan como deuda de infraestructura para Kevin si se quiere volver a intentar preview/local en el futuro.
- **Verificado en producción (sin ambiente de preview disponible, ver gap arriba):** `tsc --noEmit`, `eslint` y `next build` limpios antes de deployar. Ya en producción, se probaron y revirtieron dos casos con toggles reales: (1) desactivar la subcategoría "Papas Fritas" — desaparece de `/carta` y del picker de pedidos por WhatsApp sin afectar "Provoletas" ni "Empanadas"; (2) desactivar la categoría padre "Entradas" dejando sus 3 subcategorías activas — "Entradas" y su producto propio ("Rabas") desaparecen, mientras "Provoletas", "Empanadas" y "Papas Fritas" se siguen mostrando, cada una como su propia sección de nivel superior sin el título "Entradas". Ambos toggles se revirtieron a su estado original (todo `is_active = true`) antes de terminar.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario, plan revisado y aprobado antes de codear.
- **Fecha:** 15 de agosto de 2026

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
