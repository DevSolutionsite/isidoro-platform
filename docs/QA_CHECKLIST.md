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

### 4. Carta pública (`/carta`)

> 🔴 **BLOQUEADO 17 jul 2026 — ver DEC-023 en `DECISIONS.md`.** `categories`, `products` y `rewards` devuelven `permission denied for function current_user_role` para el rol `anon` (confirmado contra la API REST de Supabase directamente, no es un bug de frontend). `/carta` no muestra productos ni categorías para ningún visitante sin sesión. Pausado hasta que Kevin resuelva el RLS/grants — no tiene sentido seguir tildando ítems de este flujo (ni del Flujo 5, que depende de `rewards`) hasta entonces.

1. [ ] Entrar a `/carta` sin sesión iniciada → **esperado:** carga sin pedir login (es pública); el ícono de usuario en el header lleva a `/login`.
2. [ ] Entrar a `/carta` con sesión de cliente iniciada → **esperado:** el ícono de usuario en el header lleva a `/perfil`.
3. [ ] Abrir el menú hamburguesa (izquierda) → **esperado:** se abre un drawer lateral con las categorías.
4. [ ] Tocar una categoría del drawer → **esperado:** el drawer se cierra y la página hace scroll suave hasta la sección de esa categoría.
5. [ ] Verificar que **solo aparecen categorías con al menos un producto disponible** — una categoría sin productos `is_available=true` no debe mostrar su sección.
6. [ ] Verificar que un producto marcado `is_available=false` en el admin **no aparece** en la carta pública (no se muestra ni siquiera como "sin stock" — se excluye directamente).
7. [ ] Si hay una promoción activa (`is_active=true`, dentro del rango `valid_from`–`valid_until`) → **esperado:** aparece en el carrusel superior con badge "PROMO", sin precio.
8. [ ] Si hay una oferta por horario activa en el horario actual → **esperado:** aparece en el carrusel con badge "AHORA"; si el primer producto asociado tiene `price_override`, se muestra el precio con descuento.
9. [ ] Para un producto con `price_override` activo por una oferta de horario → **esperado:** en su card se ve el precio con descuento tachando el original, badge "PROMO", y los puntos a ganar (`+N pts`) calculados sobre el precio **con descuento**, no el original.
10. [ ] **Fix aplicado 16 jul 2026 — verificar:** crear/editar una oferta por horario con horario que cruza medianoche (ej. `start_time=22:00`, `end_time=02:00`) → **esperado ahora:** la oferta se activa correctamente durante ambos tramos (ej. a las 23:00 y a la 01:00), y permanece inactiva en el resto del día (ej. a las 10:00). Confirmar en horario real o simulando la hora del sistema.
11. [ ] Buscar si existe algún input de búsqueda o filtro en la carta → **esperado:** no existe, solo navegación por categoría vía el menú hamburguesa. (No marcar como bug — es el diseño actual.)

### 5. Perfil del cliente + canje de recompensas

1. [ ] Loguearse con Cliente C (con puntos suficientes) y entrar a `/perfil`.
2. [ ] Verificar que el QR personal se renderiza (SVG) — si `qr_token` fuera null, debería verse un placeholder gris "QR no disponible" (caso borde, no debería pasar en un cliente normal).
3. [ ] Verificar el mensaje motivacional bajo el puntaje: `<80 pts` → "Te faltan N puntos para tu primer canje"; `80–199 pts` → "Ya podés canjear tu primera recompensa"; `≥200 pts` → "¡Podés canjear varias recompensas!". **Nota:** estos umbrales son fijos en el código, no están atados al costo real de las recompensas — no marcar como bug si no coincide exactamente con el costo de una recompensa puntual.
4. [ ] Verificar que la sección de recompensas **solo muestra las que el cliente puede pagar** con su saldo actual — una recompensa más cara que el saldo no debe aparecer ni siquiera deshabilitada.
5. [ ] Tocar "Canjear" en una recompensa → **esperado:** aparece un modal a pantalla completa con el nombre de la recompensa, un código de 6 dígitos, y un cronómetro `MM:SS` regresivo arrancando en 15:00.
6. [ ] Dejar el modal abierto sin recargar la página hasta que el cronómetro llegue a 0 → **esperado:** el cronómetro cambia a rojo cuando quedan <60s, y al llegar a 0 el mensaje cambia a "Código vencido — generá uno nuevo" con los dígitos en rojo.
7. [ ] Cerrar el modal ("Cerrar") y volver a intentar canjear la misma recompensa → **esperado:** genera un código nuevo.
8. [ ] Intentar canjear una recompensa con `stock = 0` (si hay una cargada para test) → **esperado:** redirect a `/perfil?canje_error=out_of_stock`, banner rojo "Sin stock disponible para esta recompensa".
9. [ ] Si hay forma de dejar el saldo justo por debajo del costo de todas las recompensas visibles (edge case) → **esperado según código:** el error `insufficient_points` no tendría dónde renderizarse porque la lista de recompensas desaparece entera si `affordableRewards` queda vacío. Si se puede reproducir, confirmar que el mensaje de error efectivamente no se ve (gap conocido, no bloqueante pero vale documentarlo).
10. [ ] Revisar el historial de movimientos (`TransactionHistory`) → **esperado:** hasta 20 movimientos, etiquetados como "Consumo en Isidoro" / "Canje de recompensa" / "Ajuste manual" / "Puntos vencidos" según corresponda, con signo y color acordes (positivo = dorado, negativo = gris, vencimiento = rojo).
11. [ ] Con un cliente sin movimientos → **esperado:** "Todavía no tenés movimientos. ¡Empezá acumulando puntos en tu próxima visita!"

---

## CAJERO

### 6. Registrar consumo (`/caja`)

1. [ ] Loguearse como cajero (o admin) y entrar a `/caja`.
2. [ ] Buscar un cliente por **nombre parcial** → **esperado:** encuentra el primer cliente cuyo nombre contiene el texto (case-insensitive).
3. [ ] Buscar por **QR token exacto** (pegar el valor de `qr_token`, no el nombre) → **esperado:** matchea exacto antes que la búsqueda por nombre.
4. [ ] Buscar algo que no existe → **esperado:** "Cliente no encontrado — Verificá el QR o el nombre ingresado".
5. [ ] Con un cliente encontrado, verificar que se muestra su nombre, teléfono (si tiene) y saldo de puntos actual.
6. [ ] Cargar un monto (ej. `15000`) → **esperado:** preview en vivo de puntos a acreditar (`Math.floor(monto * points_per_peso)`), actualizado en tiempo real mientras se escribe.
7. [ ] Dejar el monto vacío o en 0 → **esperado:** el botón "Registrar consumo" queda deshabilitado.
8. [ ] Agregar una nota opcional (ej. "Mesa 5") y confirmar → **esperado:** redirect a `/caja` con banner de éxito "Consumo registrado — <Cliente> recibió +N pts".
9. [ ] Verificar en `/perfil` del cliente afectado (o en `/admin/clientes/[id]`) que el saldo y el historial reflejan el consumo recién cargado.

### 7. Confirmar canje (`/caja/canje`)

1. [ ] Desde `/caja`, ir a la pestaña "Canje".
2. [ ] Generar un código de canje válido desde el perfil de un cliente (paso previo, ver sección 5) y cargarlo dígito por dígito → **esperado:** el foco salta automáticamente al siguiente casillero al tipear, y al completar el 6to dígito se envía solo (sin tocar ningún botón).
3. [ ] Pegar (Ctrl+V) un código de 6 dígitos copiado → **esperado:** se distribuye automáticamente en los 6 casilleros.
4. [ ] Confirmar un código válido y no vencido → **esperado:** redirect con success — nombre de la recompensa, puntos usados, saldo nuevo del cliente.
5. [ ] Probar un código de formato inválido (menos de 6 dígitos, letras) → **esperado:** "Código inválido — solo 6 dígitos numéricos" (o el submit ni se dispara si falta algún dígito).
6. [ ] Probar un código que no existe → **esperado:** "Código no encontrado — verificá los dígitos".
7. [ ] Dejar pasar 15+ minutos desde que se generó un código y confirmarlo → **esperado:** "Código vencido — el cliente debe generar uno nuevo desde su perfil".
8. [ ] Confirmar el mismo código dos veces seguidas (después de un canje exitoso) → **esperado:** la segunda vez da "Código no encontrado" (ya no está `pending`).
9. [ ] Verificar que el saldo y stock de la recompensa se actualizaron correctamente tras el canje (FIFO de puntos, stock decrementado si la recompensa tiene stock limitado).

### 8. División de cuenta (`/caja/division`)

1. [ ] Desde `/caja`, ir a la pestaña "División".
2. [ ] Buscar y agregar un solo cliente, e intentar dividir → **esperado:** el botón "Dividir cuenta" está deshabilitado (mínimo 2 clientes).
3. [ ] Buscar y agregar el mismo cliente dos veces → **esperado:** el segundo intento muestra "Ya está en la división" en vez de duplicarlo en la lista.
4. [ ] Buscar un cliente inexistente → **esperado:** "Cliente no encontrado".
5. [ ] Agregar 2 o más clientes, cargar un monto para cada uno → **esperado:** cada fila muestra su propio preview de puntos en vivo; el botón "Quitar" saca a un cliente de la lista sin afectar a los demás.
6. [ ] Dejar el monto de algún cliente vacío o en 0 → **esperado:** el botón "Dividir cuenta" queda deshabilitado hasta que todos tengan monto válido.
7. [ ] Cargar el campo opcional "Monto total de la mesa" con un valor que **no coincide** con la suma de los montos individuales → **esperado:** aparece advertencia inline en rojo ("No coincide con el total de la mesa...") **antes** de intentar enviar, y el botón queda deshabilitado.
8. [ ] Corregir el monto total para que coincida (o dejarlo vacío) y confirmar la división → **esperado:** resultado inline mostrando, por cada cliente, los puntos ganados y su nuevo saldo — sin salir de la pantalla ni perder el estado.
9. [ ] Tocar "Nueva división" después de un resultado exitoso → **esperado:** resetea todo el formulario (lista vacía, campos limpios) para empezar de nuevo.
10. [ ] Verificar en `/perfil` (o `/admin/clientes`) de cada cliente que participó que su saldo aumentó según lo esperado, y que el consumo quedó agrupado por el mismo `session_id` en la base (chequeo técnico, no visible en UI — opcional si tenés acceso a la DB).

---

## ADMIN

> Todas las rutas admin requieren rol `admin`. Antes de arrancar esta sección: **loguearse con una cuenta `cliente` y navegar directo a cualquier URL `/admin/*`** → esperado: redirect silencioso a `/login` (no un error 403 visible). Confirmar esto una sola vez al principio.

### 9. Productos (`/admin/productos`)

1. [ ] Entrar a `/admin/productos` → lista con nombre, categoría, precio, orden, disponibilidad (Sí/No) y acciones.
2. [ ] Crear un producto nuevo con todos los campos (nombre, categoría, descripción, precio, orden, `image_url` opcional, disponible tildado) → **esperado:** redirect a la lista con banner "Creado correctamente."
3. [ ] Crear un producto **sin** nombre o sin categoría → **esperado:** bloqueo por `required` del navegador.
4. [ ] Cargar un `sort_order` vacío → **esperado:** se guarda como `0` silenciosamente (no debería dar error).
5. [ ] Editar un producto existente, cambiar el precio y desmarcar "Disponible" → **esperado:** banner "Actualizado correctamente.", y el producto deja de aparecer en `/carta` (ver sección 4, punto 6).
6. [ ] Eliminar un producto (botón "Eliminar" → confirma con "Sí, eliminar") → **esperado:** banner "Eliminado correctamente."
7. [x] **Fix aplicado 17 jul 2026 — verificar:** eliminar un producto ya no debe aparecer en `/admin/productos` — `deleteProduct` setea `deleted_at` correctamente (soft-delete real), y ahora el query de la lista filtra `is('deleted_at', null)`. Detectado durante QA en vivo: el banner decía "Eliminado correctamente" pero el producto seguía listado — confirmado que era exactamente este gap. Ver DEC-025.
8. [ ] Cargar una URL en `image_url` y guardar → luego revisar `/carta`: **esperado según código:** la imagen **no se muestra** en la card pública (siempre placeholder) — no es un bug de esta sesión, es una funcionalidad no implementada (falta Supabase Storage). No reportar como bug nuevo.

### 10. Categorías (`/admin/categorias`)

1. [ ] Entrar a `/admin/categorias` → lista con nombre, orden, cantidad de productos.
2. [ ] Crear una categoría nueva (nombre + orden) → banner "Creado correctamente."
3. [ ] Verificar que el conteo de "Productos" de una categoría cuenta **todos** los productos asociados, estén disponibles o no (incluye no-disponibles y potencialmente eliminados).
4. [ ] Editar el nombre de una categoría con productos asociados → confirmar que el nombre se actualiza también en `/carta`.
5. [ ] Eliminar una categoría que **tiene productos asociados** → **esperado:** no hay ningún bloqueo ni advertencia, se elimina igual. La categoría ya no debe listarse en `/admin/categorias` (fix aplicado, ver DEC-025) ni en el dropdown de categoría al crear/editar un producto. **Caso a verificar (esto sigue abierto, no lo resuelve el fix de listas):** los productos que quedaron con `category_id` apuntando a esa categoría eliminada — ¿qué pasa con ellos en `/carta`? El query de productos de la carta pública no hace join-filtro sobre `deleted_at` de la categoría padre, así que es esperable que sigan apareciendo agrupados bajo el nombre de esa categoría "fantasma" ahí (distinto del admin, que ya no la muestra). Bloqueado por DEC-023 para verificar en vivo.

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
