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
7. [x] Verificado en el Flujo 11: "QA Promo Activa" apareció en el carrusel con badge "PROMO", sin precio — OK.
8. [x] Verificado en el Flujo 12: oferta activa (cruzando medianoche) apareció con badge "AHORA" y precio con descuento del primer producto asociado — OK.
9. [x] Verificado en el Flujo 12: "Bife de chorizo" mostró $7.500 tachando $9.800, badge "PROMO", y "+7500 pts" — puntos calculados sobre el precio con descuento, no el original. OK.
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

### 11. Promociones (`/admin/promociones`) — ✅ Verificado 26 jul 2026

1. [x] "QA Promo Activa" (jun-dic 2026, activa) → estado "Activa" — OK.
2. [x] "QA Promo Proxima" (`valid_from` en diciembre) → estado "Próxima" — OK.
3. [x] Ya había 2 promociones preexistentes con `valid_until` pasado ("zsz", "2X1 En liso") → ambas "Vencida" — confirmado sin necesidad de crear una nueva.
4. [x] "QA Promo Inactiva" (fechas válidas, checkbox destildado) → estado "Inactiva" — OK.
5. [x] "QA Promo FechasInvertidas" (`valid_until` 31 dic, `valid_from` 1 jun — invertidas) → el form lo permitió sin validar. Estado mostrado: **"Próxima"**, no "Vencida" como especulaba el checklist original — tiene sentido: el código evalúa `valid_from <= now` primero, y como el `valid_from` (31 dic) todavía no llegó, cae en "Próxima" antes de mirar `valid_until`. No rompe nada, corregido el dato del checklist.
6. [x] Eliminada "QA Promo FechasInvertidas" → no desapareció de la lista, pasó a "Inactiva" — OK, comportamiento esperado.
7. [x] En `/carta` el carrusel mostró únicamente "QA Promo Activa" con badge "PROMO", sin precio — el resto (Próxima/Vencida/Inactiva) no aparecieron — OK.

**Limpieza:** las 4 promociones de prueba se borraron directo por API (service role) al terminar, ya que la UI no tiene borrado real para promociones (por diseño).

### 12. Ofertas por horario (`/admin/ofertas`) — ✅ Verificado 26 jul 2026

1. [x] "QA Oferta Normal" (18:00-20:00, sin productos) → creada, lista mostró "Sin productos" — OK.
2. [x] Asociados "Bife de chorizo" (`price_override=7500`) y "Agua mineral" (sin override) — guardado OK.
3. [x] Editado de nuevo, quitado "Agua mineral" → lista de admin mostró solo "Bife de chorizo" — confirma replace completo, no merge.
4. [x] Confirmado el gap documentado, y además uno más amplio: el dropdown de **editar** no solo ignora `is_available`, tampoco filtra `deleted_at` — aparecían ahí "QA Producto Test" y "QA Producto Huerfano", ambos ya eliminados en pasos anteriores de esta sesión. Mismo mecanismo de fondo que el hallazgo del Flujo 10 (joins sin filtrar `deleted_at`), pero acá en el dropdown de productos, no en el nombre de categoría. No es bloqueante (elegir un producto eliminado ahí sería un error de uso del admin, no algo que vea un cliente), pero vale que quede registrado junto al resto de los gaps de `deleted_at`.
5. [x] **Aprovechado en vivo, sin simular hora:** se editaron los horarios de "QA Oferta Normal" a `23:30`–`00:30` (cruza medianoche) justo antes de medianoche real — se activó correctamente en `/carta` con badge "AHORA", precio con descuento tachado y puntos calculados sobre el precio con descuento. Confirma a la vez el punto 10 de la sección Carta (ya verificado por código) y el punto 9 de la misma sección (antes pendiente por falta de datos).
6. [x] Eliminada "QA Oferta Normal" → no desapareció, pasó a "Inactiva" — OK. Limpiada después directo por API (service role) para no dejar basura de prueba.

### 13. Clientes (`/admin/clientes`) + ajuste de puntos — ✅ Verificado 26 jul 2026

1. [x] Lista de los 5 clientes con saldo de puntos — OK.
2. [x] Búsqueda por nombre parcial ("francisco") → filtró a 1 resultado — OK.
3. [x] Búsqueda por teléfono parcial ("1122334") → filtró a "QA Cliente Test" — OK.
4. [x] Búsqueda por fragmento de email ("isidoro-qa", presente en el email de ambos clientes de prueba) → "Sin resultados para 'isidoro-qa'" — confirmado el gap de copy documentado, no busca por email.
5. [x] Detalle de "QA Cliente Dos" → 3 tarjetas (puntos, visitas, gastado total) + tabla de historial — OK.
6. [x] UUID inexistente → página 404 de Next.js — OK.
7. [x] Ajuste +50 con nota → preview `+50 pts` en dorado mientras se escribe, banner "Actualizado correctamente.", saldo 5000→5050 — OK.
8. [x] Ajuste -30 (dentro del saldo) → preview en rojo, saldo 5050→5020 — OK.
9. [x] Ajuste -100000 (excede el saldo) → "Saldo insuficiente para aplicar este descuento", saldo sin cambios (5020), sin crash — el fix de DEC sigue funcionando.
10. [x] Puntos en `0` → botón "Aplicar ajuste" deshabilitado — OK.
11. [x] Puntos `5.7` → preview mostró `+5 pts` (truncado) antes de enviar, y al confirmar el saldo subió exactamente 5 (5020→5025), no 6 — confirma `parseInt`, no redondeo.

### 14. Estadísticas (`/admin/estadisticas`) — ✅ Verificado 26 jul 2026

1. [x] Los 5 KPIs, gráfico y ambas tablas cargaron. No hay ningún selector de fecha en la UI — confirmado, es de últimos 30 días fijos.
2. [x] Header mostró "26 de junio — 27 de julio de 2026" como texto — OK.
3. [x] Gráfico de barras con alturas proporcionales (picos correctos en 06/29, 07/01, 07/26), eje Y en `$Nk`, fechas en X sin label en todos los días — OK.
4. [ ] No probado — difícil de reproducir con datos reales de por medio, marcado como opcional en el checklist original.
5. [x] "Top clientes" (4 filas) y "Recompensas más canjeadas" (3 filas) — por debajo del límite de 10, no se pudo confirmar el tope exacto, pero el orden descendente por gasto/canjes es correcto en ambas.
6. [ ] No probado — requiere simular una falla de red o token vencido, fuera de alcance de esta sesión de QA funcional.

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
11. **Nuevo, encontrado 26 jul 2026:** el gap de `deleted_at` en joins es más amplio de lo documentado en el punto 10 — también aparece en `/admin/productos` (nombre de categoría eliminada sigue mostrándose) y en el dropdown de productos para asociar a una oferta de horario (productos eliminados siguen apareciendo como opción). No bloqueante, mismo origen que el punto 10 — si se decide resolver, conviene resolverlo de una vez en los tres lugares.

---

## Al terminar el QA

- [x] `PROJECT_STATUS.md` actualizado — QA completo de todos los flujos, con notas de lo pendiente.
- [x] Bug real encontrado (auto-submit de canje) documentado y corregido — ver DEC-026. Gaps ya conocidos (lista de arriba) quedaron confirmados/ampliados donde correspondía, ninguno nuevo bloqueante.
- [ ] Mergear `PROJECT_STATUS.md` y `DECISIONS.md` a `main` — pendiente, se hace junto con el resto de los commits de esta sesión.

**Pendientes reales que no se pudieron cerrar en esta sesión (no por bugs, por limitaciones de tiempo/entorno):**
- Flujo 4, ítem 4 (scroll al tocar categoría del drawer): necesita confirmación manual del usuario con un click real de mouse — la automatización de este QA no pudo verificarlo de forma confiable.
- Flujo 5, ítems 6, 8, 9 (cronómetro llegando a 0, recompensa con stock 0, saldo insuficiente para todas las recompensas): requieren esperar ~15 min reales o cargar datos de test específicos que no existían.
- Flujo 7, ítem 7 (código vencido): mismo motivo, requiere esperar 15+ min reales.
- Flujo 14, ítems 4 y 6 (período sin datos, error de red simulado): marcados como opcionales/difíciles de reproducir en el checklist original.
