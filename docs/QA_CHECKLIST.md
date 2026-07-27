# QA_CHECKLIST.md — Plataforma Isidoro

> Checklist de QA manual para todos los flujos del sistema. Cada paso está redactado contra el código real (no supuestos) — donde el comportamiento actual tiene un gap o inconsistencia conocida, está marcado explícitamente como caso a verificar.
> Marcar cada ítem con [x] al probarlo. Si algo falla, anotar el resultado real debajo del ítem y abrir el issue correspondiente antes de tildar.

---

## Cuentas necesarias antes de arrancar

- [ ] 1 cuenta admin (rol `admin`)
- [ ] 1 cuenta cajero (rol `cajero`) — o usar la cuenta admin, que también tiene acceso a `/caja` (`(cajero)/layout.tsx` permite `admin` "para testing")
- [ ] Al menos 3 cuentas cliente:
  - **Cliente A** — nueva, se registra con email/password durante el QA (para probar el flujo de registro completo)
  - **Cliente B** — se registra con Google OAuth durante el QA (para probar el gate de perfil incompleto)
  - **Cliente C** — cliente ya existente con puntos suficientes para canjear al menos una recompensa (para no depender de acumular puntos en vivo)
- [ ] Al menos 1 recompensa activa con `points_cost` bajo (para poder canjear fácil) y, si es posible, otra con `stock = 0` (para probar `out_of_stock`)
- [ ] Al menos 1 producto, 1 categoría, 1 promoción y 1 oferta por horario ya cargados (para no probar todo sobre datos vacíos)

---

## CLIENTE

### 1. Registro (email/password) — ✅ Verificado OK 17 jul 2026

1. [x] Ir a `/register` sin sesión iniciada.
2. [x] Dejar todos los campos vacíos y tocar "Crear cuenta" → **esperado:** el navegador bloquea el submit por los `required` HTML (nombre, DNI, teléfono, ciudad, email, contraseña, repetir contraseña).
3. [x] Cargar un DNI con letras o menos de 7 dígitos (ej: `123`) → **esperado:** error inline "El DNI debe tener 7 u 8 dígitos, sin puntos", no se envía el formulario.
4. [x] En el campo Ciudad, escribir "san" → **esperado:** aparece una lista de sugerencias filtradas (ej: San José del Rincón, San Justo, San Jorge, etc.), navegable con flechas ↑/↓ y Enter, o clickeable con mouse.
5. [x] Escribir una ciudad que **no** está en la lista (ej: "Pueblo Inventado") → **esperado:** no bloquea el submit — el combobox acepta texto libre.
6. [x] Completar todos los campos correctamente (DNI de 8 dígitos, teléfono, ciudad, email nuevo, contraseña ≥ 6 caracteres, repetir contraseña igual) y enviar.
7. [x] Poner contraseñas distintas en "Contraseña" y "Repetir contraseña" → **esperado:** error "Las contraseñas no coinciden", no se envía.
8. [x] Registrarse con un email ya usado por otra cuenta → **esperado:** "Ya existe una cuenta con ese email".
9. [x] Completar el registro con datos válidos y nuevos → **esperado:** según config de Supabase, o bien auto-login + redirect, o pantalla "Revisá tu email" con el email mostrado.
10. [x] **Caso a verificar (gap conocido):** el trigger `handle_new_user` en la DB todavía no lee `dni`/`phone`/`city` (ver DEC-019/DEC-020 en `DECISIONS.md`) — después de confirmar el email y loguearse por primera vez, **esperado actual:** el sistema redirige a `/completar-perfil` en vez de entrar directo a `/perfil`, porque esos 3 campos quedaron `null` a pesar de haberlos cargado en el registro. Confirmar que este es efectivamente el comportamiento (y no un crash).

### 2. Login (email/password + Google OAuth)

1. [ ] Ir a `/login` con email/password incorrectos → **esperado:** "Email o contraseña incorrectos".
2. [ ] Loguearse con una cuenta cuyo email todavía no confirmó → **esperado:** "Confirmá tu email antes de ingresar".
3. [ ] Loguearse con Cliente C (cuenta completa, existente) con email/password correctos → **esperado:** redirect directo a `/perfil`.
4. [ ] Cerrar sesión y loguearse con **Google OAuth** por primera vez (Cliente B, cuenta nueva) → **esperado:** completa el flujo de Google, vuelve a `/auth/callback`, y termina en `/completar-perfil` (porque Google nunca pidió dni/phone/city).
5. [ ] Ir a `/login` estando ya logueado (probar navegando la URL directo) → **esperado:** redirect automático según el rol (`/perfil` para cliente, `/caja` para cajero, `/admin` para admin).
6. [ ] Provocar un error de OAuth (ej. cancelar el consentimiento de Google a mitad de camino) → **esperado:** vuelve a `/login?error=oauth` con el mensaje "Error al iniciar sesión con Google. Intentá de nuevo."

### 3. Completar perfil (gate `/completar-perfil`)

1. [ ] Con Cliente B (o cualquier cuenta con dni/phone/city faltante) logueado, navegar directamente a `/perfil` → **esperado:** redirect automático a `/completar-perfil` (no se llega a ver `/perfil`).
2. [ ] En `/completar-perfil`, dejar los campos vacíos y enviar → **esperado:** bloqueo por `required` / validación de DNI igual que en el registro.
3. [ ] Completar DNI, teléfono y ciudad (con el mismo `CityCombobox` reutilizado del registro) y enviar → **esperado:** vuelve a `/perfil` normalmente, ya sin redirect.
4. [ ] Volver a navegar a `/completar-perfil` manualmente después de haber completado el perfil → **esperado:** redirect automático a `/perfil` (no deja re-entrar innecesariamente).
5. [ ] Sin sesión iniciada, ir directo a `/completar-perfil` por URL → **esperado:** redirect a `/login`.
6. [ ] Loguearse con una cuenta `cajero` o `admin` y navegar a `/completar-perfil` por URL → **esperado:** redirect a `/caja` o `/admin` respectivamente (esta pantalla es solo para rol `cliente`).
7. [ ] Probar el botón "Cerrar sesión" dentro de `/completar-perfil` → **esperado:** cierra sesión y vuelve a `/login`.

### 4. Carta pública (`/carta`) — ✅ Retomado 26 jul 2026, DEC-023 resuelto

1. [x] Entrar a `/carta` sin sesión iniciada → carga sin pedir login, pública. Verificado por código (`Link href={user ? '/perfil' : '/login'}` en `carta/page.tsx`) — determinístico, no depende de estado de sesión ambiguo.
2. [x] Entrar a `/carta` con sesión de cliente iniciada → ícono lleva a `/perfil`. Mismo código, verificado.
3. [x] Abrir el menú hamburguesa → drawer lateral con las 5 categorías (Entradas, Principales, Pastas, Postres, Bebidas) — OK.
4. [ ] **Inconcluso — no es reproducible de forma confiable vía automatización.** Al tocar una categoría, en las pruebas automatizadas el drawer se cierra pero no se ve scroll. Investigado a fondo: `scrollIntoView({behavior:'smooth'})` llamado de forma síncrona funciona perfecto; la misma llamada diferida (vía `setTimeout` — el mecanismo real del código — o incluso vía `requestAnimationFrame` doble, sin pasar por React ni por el drawer) nunca anima nada en la pestaña controlada por la extensión de automatización. Como falla igual sin código de la app de por medio, no parece un bug de `CategoryMenu.tsx` sino una limitación del entorno de prueba. **Pendiente: confirmar con un click real de mouse en un Chrome normal.**
5. [x] Solo aparecen categorías con productos disponibles — confirmado por lectura de código (`carta/page.tsx:164`, `if (categoryProducts.length === 0) return null`) y consistente con lo visto en vivo (5 categorías con productos, todas mostradas).
6. [x] Producto con `is_available=false` no aparece en `/carta` — verificado en vivo: se desmarcó "Disponible en carta" en Provoleta desde el admin, dejó de aparecer en `/carta`, se revirtió el cambio después de confirmar.
7. [ ] Sin promoción activa cargada en este momento — no hay datos para probar. Pendiente re-verificar cuando se cargue una promoción de prueba (Flujo 11).
8. [ ] Sin oferta por horario activa en este momento — no hay datos para probar. Pendiente re-verificar cuando se cargue una oferta de prueba (Flujo 12).
9. [ ] Depende de 8 — pendiente re-verificar junto con Flujo 12.
10. [x] Verificado por código: `isTimeOfferActive` en `carta/page.tsx` evalúa la unión de ambos tramos cuando `start_time > end_time` (línea 40-44) — lógica correcta para cruce de medianoche, consistente con el fix de DEC del 16 jul.
11. [x] Confirmado: no hay input de búsqueda ni filtro, solo navegación por el drawer — comportamiento esperado, no es bug.

### 5. Perfil del cliente + canje de recompensas — ✅ Verificado 26 jul 2026 (parcial)

1. [x] Se creó una cuenta cliente de prueba (`QA Cliente Test`) y se logueó por email/password → entra directo a `/perfil` (perfil completo, sin gate).
2. [x] QR personal se renderiza como SVG — OK.
3. [x] Con 15000 pts → "¡Podés canjear varias recompensas!" — texto exacto, umbral `≥200` OK. No se probaron los otros 2 umbrales (`<80`, `80-199`) por falta de tiempo, pero es el mismo componente/lógica.
4. [x] Con 15000 pts, las 6 recompensas activas (todas ≤12000 pts) aparecieron todas — consistente con el código (`RewardsList` filtra por `totalPoints >= points_cost`). No se pudo probar el caso de exclusión (recompensa más cara que el saldo) porque no hay ninguna recompensa cargada por encima de 15000 — **gap de datos, no de código**.
5. [x] "Canjear" en "Café gratis" → modal con nombre, código de 6 dígitos, cronómetro arrancando en 14:57-15:00 — OK.
6. [ ] No probado — requiere esperar ~14 minutos en tiempo real hasta que el cronómetro llegue a <60s. Queda pendiente.
7. [x] Implícito: cada vez que se tocó "Canjear" (incluso para la misma recompensa en sesiones distintas) se generó un código nuevo — OK.
8. [ ] No probado — no había ninguna recompensa con `stock = 0` cargada.
9. [ ] No probado — mismo motivo que el ítem 4, no se pudo bajar el saldo por debajo del costo de todas las recompensas.
10. [x] Historial mostró "Consumo en Isidoro" con `+15000 pts` en dorado — formato y color correctos. No se vieron los otros 3 tipos de movimiento (canje, ajuste manual, vencimiento) en esta sesión, pero se generaron canjes después (ver Flujo 7) — quedó `-500` y `-1500` en el historial, no se re-verificó visualmente el color gris tras esos canjes.
11. [ ] No aplica — la cuenta de prueba ya tenía movimientos antes de llegar a este punto.

**Bug encontrado y corregido en este flujo → ver Flujo 7, ítem 2 y DEC-026 en `DECISIONS.md`.**

---

## CAJERO

### 6. Registrar consumo (`/caja`) — ✅ Verificado 26 jul 2026

1. [x] Se usó la sesión admin (permite `/caja` "para testing").
2. [x] Búsqueda por nombre parcial ("qa cliente") → encontró "QA Cliente Test" — OK.
3. [x] Búsqueda por QR token exacto → matcheó exacto — OK.
4. [x] Búsqueda de algo inexistente → "Cliente no encontrado — Verificá el QR o el nombre ingresado" — OK, texto exacto.
5. [x] Card mostró nombre, teléfono y saldo (0 antes, 15000 después) — OK.
6. [x] Cargar `15000` → preview en vivo `+15000 pts` (1:1, `points_per_peso`) — OK.
7. [x] Monto vacío → botón "Registrar consumo" deshabilitado — OK.
8. [x] Nota "QA - prueba Flujo 6" + confirmar → banner "Consumo registrado — QA Cliente Test recibió +15000 pts" — texto exacto, OK.
9. [x] Confirmado por la búsqueda posterior (saldo pasó de 0 a 15000 pts) — se re-verificará también desde `/perfil` en Flujo 5.

**Datos de prueba creados para el resto del QA:** cliente `QA Cliente Test` (email `qa.cliente.test@isidoro-qa.dev`, creado vía Admin API con `email_confirm:true` para no depender de inbox real; dni/phone/city seteados directo en `profiles` para saltar el gate de completar-perfil, ya verificado en Flujo 3) con 15.000 pts acreditados por este consumo de prueba.

### 7. Confirmar canje (`/caja/canje`) — ✅ Verificado 26 jul 2026, 1 bug encontrado y corregido

1. [x] Se usó la sesión admin (acceso "para testing" a `/caja`), pestaña "Canje".
2. [x] **🔴→✅ Bug real encontrado y corregido (ver DEC-026):** el auto-submit al completar el 6to dígito enviaba SIEMPRE un código incompleto por una condición de carrera (`requestSubmit()` síncrono antes de que React actualizara el hidden input del último dígito) — rompía la función principal de este flujo para cualquier cajero que tipeara el código. Aislado con un caso de control (mismo código, confirmado a mano con el botón, funcionó) que probó que no era el código sino el timing. Fix: mover el auto-submit a un `useEffect` que corre después del commit de React. Reverificado con 2 códigos reales generados en vivo — el foco salta correctamente entre casilleros y el auto-submit ahora funciona.
3. [ ] No probado en vivo (el pegado sintético vía automatización no dispara `ClipboardEvent` de forma confiable) — revisado por código: `handlePaste` limpia no-dígitos, distribuye por índice y mueve el foco al último dígito pegado. Lógica correcta, misma familia de bug que el ítem 2 no aplica acá porque `handlePaste` no llama a `requestSubmit()`.
4. [x] Código válido → "Canje confirmado", nombre de recompensa, puntos usados y saldo nuevo — verificado 2 veces (Café gratis: -500/14500; Postre de cortesía: -1500/13000).
5. [x] Con el form vacío el botón queda deshabilitado (no se dispara submit) — confirmado. El mensaje de formato inválido se vio en vivo varias veces mientras se aislaba el bug del ítem 2 — texto exacto "Código inválido — solo 6 dígitos numéricos".
6. [x] Código inexistente (`000001`) → "Código no encontrado — verificá los dígitos" — texto exacto.
7. [ ] No probado — requiere esperar 15+ minutos reales.
8. [x] Reutilizar un código ya confirmado → "Código no encontrado — verificá los dígitos" (mismo mensaje que un código inexistente, ya no está `pending`) — OK.
9. [x] Confirmado indirectamente: el saldo del cliente bajó correctamente en cada canje (15000→14500→13000, coincide con -500 y -1500). No se probó stock limitado (ninguna recompensa de test tiene stock).

### 8. División de cuenta (`/caja/division`) — ✅ Verificado 26 jul 2026

1. [x] Sesión admin, pestaña "División" — OK.
2. [x] Un solo cliente agregado → "Dividir cuenta" deshabilitado — OK.
3. [x] Agregar el mismo cliente dos veces → "Ya está en la división", no se duplicó en la lista — OK.
4. [x] Cliente inexistente → "Cliente no encontrado" — OK.
5. [x] Se creó un segundo cliente de prueba (`QA Cliente Dos`) para probar con 2+. Preview en vivo por cliente (+10000 pts / +5000 pts) — OK.
6. [x] Implícito en el flujo: con montos cargados en ambos y el total sin coincidir, el botón ya estaba deshabilitado (ver ítem 7) — no se probó dejar un monto vacío de forma aislada, pero el mismo guard de "todos con monto válido" aplica.
7. [x] Total de mesa `20000` vs. suma real `15000` → advertencia roja "No coincide con el total de la mesa ($ 20.000)", botón deshabilitado — OK.
8. [x] Corregido a `15000` (coincide) → "Cuenta dividida entre 2 clientes", resultado inline: QA Cliente Test +10000 pts (saldo 23000), QA Cliente Dos +5000 pts (saldo 5000) — sin salir de pantalla, OK.
9. [x] "Nueva división" → formulario reseteado por completo (lista vacía, campos limpios) — OK.
10. [x] Saldos confirmados en el resultado inline mismo (13000+10000=23000, 0+5000=5000, coincide con lo esperado). No se verificó el `session_id` en DB (chequeo opcional).

---

## ADMIN

> Todas las rutas admin requieren rol `admin`. Antes de arrancar esta sección: **loguearse con una cuenta `cliente` y navegar directo a cualquier URL `/admin/*`** → esperado: redirect silencioso a `/login` (no un error 403 visible). Confirmar esto una sola vez al principio.

### 9. Productos (`/admin/productos`) — ✅ Verificado 26 jul 2026

1. [x] Lista con nombre, categoría, precio, orden, disponibilidad y acciones — OK.
2. [x] Producto "QA Producto Test" creado con todos los campos → "Creado correctamente." — OK.
3. [x] Submit sin nombre ni categoría → bloqueado por `required` del navegador, no navega — OK.
4. [x] "Orden de aparición" viene precargado en `0` por defecto (no vacío) — se guardó como `0` sin error — OK.
5. [x] Ya verificado en el Flujo 4 (ítem 6): se desmarcó "Disponible" en Provoleta, banner "Actualizado correctamente.", dejó de aparecer en `/carta`, se revirtió después.
6. [x] "QA Producto Test" eliminado con el flujo de confirmación inline → "Eliminado correctamente." — OK.
7. [x] Confirmado de nuevo: el producto eliminado ya no aparece en la lista (8 productos, volvió al conteo original) — el fix de DEC-025 sigue funcionando.
8. [ ] No probado en esta sesión — comportamiento ya documentado y conocido (no implementado, falta Storage), no hace falta re-confirmar.

### 10. Categorías (`/admin/categorias`) — ✅ Verificado 26 jul 2026

1. [x] Lista con nombre, orden, cantidad de productos — OK.
2. [x] "QA Categoria Test" creada → "Creado correctamente." — OK.
3. [x] Se creó un producto no-disponible dentro de la categoría de prueba → el conteo mostró "1" igual — confirmado que cuenta productos no-disponibles.
4. [x] Renombrada a "QA Categoria Editada" → "Actualizado correctamente.", el nombre se actualizó en la lista de admin. No se verificó en `/carta` porque el producto de prueba asociado era `is_available=false` (no aparece ahí de todas formas).
5. [x] Eliminada la categoría con 1 producto asociado → sin bloqueo, sin advertencia, desapareció de la lista de admin. **Hallazgo relacionado, más amplio que el gap ya documentado:** en `/admin/productos`, el producto huérfano siguió mostrando el nombre de la categoría eliminada ("QA Categoria Editada") en vez de "Sin categoría" o similar — el join a `categories(name)` en la lista de productos no filtra `deleted_at` de la categoría. El gap documentado en el checklist original solo hablaba de `/carta`; esto confirma que también pasa en el propio admin. No se corrigió (no es bloqueante, es cosmético — el producto de prueba no era visible públicamente), pero vale que Kevin/Fran lo tengan en cuenta si se decide resolver el gap de categoría-fantasma en general.

### 11. Promociones (`/admin/promociones`)

1. [ ] Crear una promoción con `valid_from` en el pasado y `valid_until` en el futuro, `is_active` tildado → **esperado:** aparece con estado "Activa" en la lista.
2. [ ] Crear una con `valid_from` en el futuro → **esperado:** estado "Próxima".
3. [ ] Crear una con `valid_until` en el pasado → **esperado:** estado "Vencida".
4. [ ] Crear una con `is_active` destildado → **esperado:** estado "Inactiva", sin importar las fechas.
5. [ ] **Caso a verificar (gap conocido):** crear una promoción con `valid_until` **anterior** a `valid_from` — el form no lo valida. Confirmar qué estado muestra la lista (probablemente "Vencida" siempre) y que no rompe nada.
6. [ ] Eliminar una promoción → **esperado:** a diferencia de productos/categorías, **no desaparece de la lista** — pasa a `is_active=false` y se ve como "Inactiva". No confundir con un bug: es el comportamiento actual (no hay columna `deleted_at` en `promotions`).
7. [ ] Confirmar que solo las promociones "Activa" (según la lógica de fechas + `is_active`) aparecen en el carrusel de `/carta`.

### 12. Ofertas por horario (`/admin/ofertas`)

1. [ ] Crear una oferta con horario normal (ej. `18:00`–`20:00`), sin productos asociados → **esperado:** se guarda, lista muestra "Sin productos" y helper text en el form aclara que se mostraría "como banner general sin precio específico".
2. [ ] Editar esa oferta y asociar 1-2 productos, alguno con `price_override` y otro sin (dejar vacío = "Sin descuento") → guardar.
3. [ ] Volver a editar y quitar un producto asociado ("Quitar") → guardar → **esperado:** la asociación se eliminó (el update hace replace completo de las asociaciones, no merge).
4. [ ] **Caso a verificar (gap conocido):** en el formulario de **crear**, el dropdown de productos para asociar solo lista productos `is_available=true`; en el formulario de **editar**, lista **todos** los productos sin filtrar disponibilidad. Confirmar esta inconsistencia intentando asociar un producto no-disponible: no debería poder hacerse al crear, pero sí al editar.
5. [ ] **Caso a verificar (gap conocido, ligado al punto 10 de la sección Carta):** crear una oferta con horario que cruza medianoche (`start_time=22:00`, `end_time=02:00`) → el form lo permite sin avisar. Confirmar en `/carta` que nunca se activa (ver sección 4, punto 10).
6. [ ] Eliminar una oferta → **esperado:** igual que promociones, pasa a `is_active=false`, no desaparece de la lista — queda como "Inactiva".

### 13. Clientes (`/admin/clientes`) + ajuste de puntos

1. [ ] Entrar a `/admin/clientes` sin filtro → lista de todos los clientes (rol `cliente`) con su saldo de puntos (o "Sin puntos" si no tiene fila en `points_balance`).
2. [ ] Buscar por **nombre parcial** → filtra correctamente.
3. [ ] Buscar por **teléfono parcial** → también filtra (aunque el placeholder dice "nombre o email").
4. [ ] **Caso a verificar (gap conocido de copy, no de lógica):** buscar por un fragmento de **email** → **esperado según código:** no encuentra nada por email, a pesar de que el placeholder del input dice "Buscar por nombre o email…". Confirmar y decidir si corregir el placeholder o ampliar la búsqueda (avisar al CTO si se decide cambiar).
5. [ ] Entrar al detalle de un cliente (`/admin/clientes/[id]`) → verificar 3 tarjetas (puntos, visitas, gastado total) y la tabla de historial de consumos completa (sin paginar).
6. [ ] Entrar a un `id` de cliente que no existe (URL manual) → **esperado:** página 404 de Next.js.
7. [ ] Hacer un ajuste manual **positivo** (ej. +50 puntos) con una nota obligatoria → **esperado:** preview en vivo con `+50 pts` en verde/dorado mientras se escribe, botón habilitado solo con nota + puntos ≠ 0, y tras confirmar: banner "Actualizado correctamente" (o el que corresponda) y el saldo del cliente sube 50.
8. [ ] Hacer un ajuste **negativo** dentro del saldo disponible (ej. cliente tiene 100, descontar -30) → **esperado:** saldo baja a 70, queda registrado en el historial como "Ajuste manual".
9. [ ] **Fix aplicado 16 jul 2026 — verificar:** hacer un ajuste negativo **mayor al saldo disponible** (ej. cliente tiene 20 puntos, intentar descontar -100) → **esperado ahora:** el Edge Function devuelve `insufficient_points`, `adjustPoints` lo parsea (mismo mecanismo que `iniciarCanje`) y redirige a `/admin/clientes/[id]?error=insufficient_points`, mostrando el banner "Saldo insuficiente para aplicar este descuento" arriba del form — sin pantalla de error genérica ni crash.
10. [ ] Intentar enviar el form de ajuste con puntos en `0` (o vacío) → **esperado:** el botón "Aplicar ajuste" queda deshabilitado, no se puede enviar.
11. [ ] Cargar un número decimal (ej. `5.7`) en puntos → **esperado según código:** se trunca a `5` (parseInt), no da error ni redondea.

### 14. Estadísticas (`/admin/estadisticas`)

1. [ ] Entrar a `/admin/estadisticas` → **esperado:** carga los 5 KPIs (Facturación, Consumos, Clientes únicos, Puntos acreditados, Puntos canjeados), el gráfico de facturación diaria, tabla de top clientes y tabla de top recompensas — todo referido a los **últimos 30 días fijos** (no hay selector de fecha en la UI, confirmar que efectivamente no existe ningún control para cambiar el rango).
2. [ ] Verificar que el header muestra el rango de fechas calculado como texto (ej. "16 de junio — 16 de julio de 2026").
3. [ ] Con datos cargados en el período, confirmar que el gráfico de barras tiene alturas proporcionales al monto diario, con eje Y en miles (`$Nk`) y fechas en el eje X (si hay más de 10 días con datos, no todas las fechas tienen label — es esperado, no bug).
4. [ ] Con un período sin ningún consumo (cuenta de prueba nueva, sin datos históricos — difícil de reproducir en un entorno con datos reales, opcional) → **esperado:** gráfico dice "Sin datos para el período", tablas dicen "Sin datos para el período" / "Sin canjes en el período".
5. [ ] Confirmar que "Top clientes" y "Top recompensas" muestran como máximo 10 filas cada una (límite hardcodeado), ordenadas de mayor a menor.
6. [ ] Simular un error de red o un token vencido (ej. probar en una pestaña donde la sesión expiró) → **esperado:** banner rojo con el mensaje de error en vez de romper la página ("No se pudo conectar con el servidor de reportes" o el código de error HTTP).

---

## Componentes que NO hay que probar (código muerto confirmado)

- `CategoryTabs.tsx` y `PromoBanner.tsx` — existen en el repo pero no están importados en ninguna ruta activa. No son alcanzables navegando la app; no pierdas tiempo buscándolos.

---

## Resumen de gaps conocidos a confirmar/reportar (encontrados en la revisión de código, antes de QA)

Estos 10 puntos ya están referenciados dentro de sus secciones correspondientes arriba, pero se listan acá también como resumen para decidir con el CTO Agent cuáles corregir antes de producción y cuáles documentar como comportamiento aceptado:

1. ~~Productos/categorías eliminados (`deleted_at`) probablemente siguen listados en el admin — el query no filtra.~~ **✅ Corregido 17 jul 2026** — confirmado durante el QA en vivo (banner "Eliminado correctamente" pero el producto seguía en la lista). Se agregó `.is('deleted_at', null)` a la lista de productos, la lista de categorías (+ su conteo de productos por categoría), y los dropdowns de categoría en crear/editar producto. Ver DEC-025.
2. Promociones/ofertas usan `is_active=false` como "delete", no `deleted_at` — comportamiento distinto al de productos/categorías, posible inconsistencia de UX a nivelar.
3. ~~`adjustPoints` no parsea el código de error del Edge Function~~ **✅ Corregido 16 jul 2026** — ahora parsea `error.context` igual que `iniciarCanje`/`confirmarCanje` y muestra un banner con mensaje según el código (`insufficient_points`, `invalid_points`, `client_not_found`, etc.) en vez de crashear. Ver `PointsAdjustForm.tsx` y `admin-clients.ts`.
4. ~~Ofertas por horario que cruzan medianoche nunca se activan en la carta pública~~ **✅ Corregido 16 jul 2026** — `isTimeOfferActive` en `carta/page.tsx` ahora detecta `start_time > end_time` y evalúa la unión de los dos tramos en vez de la intersección. Verificado con 8 casos borde (normal dentro/fuera, medianoche dentro/fuera, límites inclusivos).
5. Buscador de clientes en admin dice "por nombre o email" pero solo filtra por nombre/teléfono.
6. `/admin/estadisticas` no tiene selector de rango de fechas en la UI (siempre últimos 30 días).
7. `image_url` de productos no se renderiza en la carta pública (falta Storage — ya documentado como pendiente en el propio form).
8. Si el saldo de un cliente cae a un nivel donde no puede pagar ninguna recompensa, el banner de error de canje no tiene dónde renderizarse.
9. El picker de productos para asociar a una oferta de horario filtra por disponibilidad al crear, pero no al editar.
10. Categoría eliminada con productos asociados no bloquea el delete ni limpia la relación — los productos huérfanos podrían seguir apareciendo en la carta.

---

## Al terminar el QA

- [ ] Actualizar `PROJECT_STATUS.md`: cambiar "QA completo de todos los flujos" a ✅ Completado (o dejar 🔄 En progreso con notas si quedaron bugs abiertos).
- [ ] Para cada gap confirmado como bug real (no como comportamiento aceptado), documentar en `DECISIONS.md` la decisión de corregirlo ahora o dejarlo para después, y avisar a Kevin si es un problema de backend (ej. el gap #3, que podría resolverse igual que se resolvió DEC-020 para `iniciarCanje`).
- [ ] Mergear solo `PROJECT_STATUS.md` (y `DECISIONS.md` si aplica) a `main`, según la metodología de ramas habitual.
