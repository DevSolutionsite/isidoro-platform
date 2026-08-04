# PROJECT_STATUS.md — Plataforma Isidoro
> Actualizar al iniciar y cerrar cada jornada. El CTO Agent lee este archivo antes de responder cualquier pregunta.

**Última actualización:** 31 de julio de 2026 — Fran (landing page nueva en `/` con carrusel y CTA a la carta, ver DEC-029)
**Estado general:** EN CURSO — Semana 4 (backend completo, frontend avanzado, en producción)
**Semana actual:** 4 de 4
**Riesgo de plazo:** ⚠️ Medio — sitio en producción pero con 2 pendientes de config (ver Bloqueos activos): Auth de Supabase todavía apunta a localhost, y falta que Kevin autorice la GitHub App de Vercel para deploys automáticos.

---

## Estado por módulo

### Semana 1 — Fundamentos (bloqueantes)

| Módulo | Responsable | Estado | Notas |
|---|---|---|---|
| Setup Supabase + proyecto | Kevin | ✅ Completado | Proyecto creado, org devsolutions2, región São Paulo |
| Esquema de base de datos | Kevin | ✅ Completado | 12 tablas + RLS en todas + índices + trigger handle_new_user |
| Auth: email/password | Kevin | ✅ Completado | Supabase Auth activo + trigger crea perfil automáticamente |
| Auth: Google OAuth | Kevin | ✅ Completado | Credenciales configuradas en Google Cloud Console y Supabase Dashboard |
| RLS base (roles: cliente, cajero, admin) | Kevin | ✅ Completado | Policies activas en todas las tablas |
| Setup Next.js + estructura de carpetas | Kevin + Fran | ✅ Completado | Next.js 16 + Supabase clients + tipos TypeScript del schema |
| Design system (colores, tipografía, Tailwind) | Fran | ✅ Completado | Paleta de marca (#1f352a/#ca9e69), Playfair Display + Montserrat, logo SVG cuatrifolio |
| Layout base (nav, estructura de páginas) | Fran | ✅ Completado | Route groups (public/cliente/cajero/admin). El redirect original / → /carta fue reemplazado por una landing page, ver Post-producción |
| Carta pública con datos mock + QR estático | Fran | ✅ Completado | Mobile-first, menú hamburguesa, carrusel promos, ícono usuario, puntos por producto, precio con descuento |

### Auth (adelantado de S2, desbloqueado por Kevin en S1)

| Módulo | Responsable | Estado | Notas |
|---|---|---|---|
| Login email/password + Google OAuth | Fran | ✅ Completado | Redirect por rol. Ruta `/auth/callback` para OAuth. Validado con usuario real (Francisco Bonfanti) |
| Registro email/password + Google OAuth | Fran | ✅ Completado | `full_name`, `dni`, `phone`, `city` en `options.data` (email/password). Maneja email confirm + auto-login. Ciudad con combobox+autocompletado (DEC-019). |
| Gate `/completar-perfil` (dni/phone/city faltante) | Fran | ✅ Completado | `(cliente)/layout.tsx` redirige si falta algún dato; cubre login email/password, Google OAuth y navegación directa. `update()` sobre RLS existente (DEC-020). |

### Semana 2 — Carta digital + gestión de productos

| Módulo | Responsable | Estado | Notas |
|---|---|---|---|
| API productos (CRUD) | Kevin | ✅ Completado | PostgREST vía RLS — contratos en API_CONTRACTS.md |
| API categorías (CRUD) | Kevin | ✅ Completado | PostgREST vía RLS — contratos en API_CONTRACTS.md |
| API promociones con fechas | Kevin | ✅ Completado | PostgREST vía RLS — contratos en API_CONTRACTS.md |
| API ofertas por horario | Kevin | ✅ Completado | PostgREST + activación en cliente (DEC-013) |
| Carta pública con datos reales + categorías | Fran | ✅ Completado | Integrada con Supabase real: products, categories, promotions, time_offers, settings. Zero errores. Verificado 1 jul 2026. |
| Panel admin: gestión de productos | Fran | ✅ Completado | CRUD completo con mock. Server Actions listas para reemplazar con Supabase. |
| Panel admin: gestión de categorías | Fran | ✅ Completado | CRUD completo con mock. Muestra conteo de productos por categoría. |
| Panel admin: promociones y ofertas por horario | Fran | ✅ Completado | CRUD completo con mock. PromoForm con datetime-local, TimeOfferForm con product associations + price_override. |
| QR dinámico funcional | Fran | ✅ Completado | SVG server-side desde `profiles.qr_token` real |

### Semana 3 — Sistema de puntos + caja

| Módulo | Responsable | Estado | Notas |
|---|---|---|---|
| Lógica de acreditación de puntos | Kevin | ✅ Completado | register_consumption SQL fn — atómico |
| Vencimiento de puntos (FIFO, 12 meses) | Kevin | ✅ Completado | FIFO en confirm_redemption + expires_at en créditos |
| Recompensas con stock opcional | Kevin | ✅ Completado | PostgREST + stock decrementado en confirm_redemption |
| Generación de código de canje (6 dígitos) | Kevin | ✅ Completado | Edge Fn initiate-redemption — crypto.getRandomValues |
| Confirmación de canje por cajero | Kevin | ✅ Completado | Edge Fn confirm-redemption — SQL atómica con FOR UPDATE |
| Perfil del cliente (historial, saldo de puntos) | Fran | ✅ Completado | Integrado con `points_balance`/`points_transactions` reales desde el 30 jun (commit `f9b0a5d`). |
| QR personal del cliente | Fran | ✅ Completado | SVG generado server-side con lib `qrcode` desde `profiles.qr_token` |
| Vista cajero: registrar consumo | Fran | ✅ Completado | `/caja`: búsqueda por QR/nombre, card cliente con saldo, form con preview de puntos en tiempo real. |
| Vista cajero: confirmar canje con código | Fran | ✅ Completado | /caja/canje — OTP 6 dígitos, confirm-redemption Edge Fn, success/error states, tab nav. **Probado end-to-end con datos reales (1 jul 2026)** |

### Semana 4 — División de cuenta + estadísticas + QA

| Módulo | Responsable | Estado | Notas |
|---|---|---|---|
| División de cuenta (lógica proporcional) | Kevin | ✅ Completado | Edge Fn split-consumption — SQL atómica, session_id server-side |
| Ajuste manual de puntos (admin) | Kevin | ✅ Completado | Edge Fn adjust-points + SQL fn adjust_points — atómico, solo admin |
| Endpoints de reportes y estadísticas | Kevin | ✅ Completado | Edge Fn reports — 4 SQL fns en paralelo, solo admin |
| UI división de cuenta | Fran | ✅ Completado | `/caja/division` (tercer tab en CajaTabs). Búsqueda de clientes client-side vía Server Action (sin reload), monto individual por cliente con preview de puntos, chequeo cruzado opcional de total de mesa, resultado inline por cliente. Integrado con Edge Fn `split-consumption` real (no mock). |
| Dashboard de estadísticas | Fran | ✅ Completado | Integrado con Edge Fn `reports` real (no mock): KPIs, gráfico de consumos por día, top clientes, top recompensas. |
| Panel admin: búsqueda y gestión de clientes | Fran | ✅ Completado | Buscador por nombre/email (debounce URL), tabla con puntos, detalle con historial de consumos + form ajuste manual de puntos. |
| QA completo de todos los flujos | Kevin + Fran | ✅ Completado | Los 14 flujos de `docs/QA_CHECKLIST.md` verificados el 26 jul. 1 bug real encontrado y corregido (auto-submit de canje en `/caja/canje`, ver DEC-026). Quedaron sin verificar ~8 ítems puntuales por requerir esperas reales de 15 min o datos de test específicos (cronómetro venciendo, stock 0, código vencido) — no bloqueantes, ver detalle al final de `QA_CHECKLIST.md`. Un ítem (scroll del drawer de categorías en `/carta`) necesita confirmación manual del usuario, automatización no concluyente. |
| Deploy a producción | Kevin + Fran | ✅ Completado | https://isidoro-platform.vercel.app — desplegado 29 jul desde `main` (ya con `feature/frontend` mergeado completo, ver DEC-028). Falta config de Auth en Supabase y conexión de GitHub para deploy automático, ver Bloqueos activos. |

### Post-producción (después del primer deploy, ver DEC-028)

| Módulo | Responsable | Estado | Notas |
|---|---|---|---|
| Landing page en `/` con carrusel y CTA a la carta | Fran | ✅ Completado | `/` ya no redirige directo a `/carta` — landing con logo, hero con carrusel auto-rotante (imágenes placeholder de Unsplash, TODO reemplazar por fotos reales del restaurante), botón "Ver la carta" y footer con 4 redes sociales. No toca carta, admin, cajero, auth ni lógica de puntos. Ver DEC-029. |

---

## Bloqueos activos
- 🔴 **Fran/Kevin, urgente para poder usar producción de verdad:** Supabase Auth todavía tiene `Site URL` apuntando a `http://localhost:3000` — cualquier redirect que maneja Supabase (login con Google, confirmación de email, reset de contraseña) manda al usuario a localhost en vez de a producción. Fix: Dashboard de Supabase → Authentication → URL Configuration → cambiar Site URL a `https://isidoro-platform.vercel.app` y agregar `https://isidoro-platform.vercel.app/**` a Redirect URLs. No requiere cambios en Google Cloud Console (el callback de Google apunta al dominio fijo de Supabase). Ver DEC-028.
- ⚠️ **Kevin, no bloqueante pero requerido para deploy automático:** el repo de GitHub (`kevindavezac1/isidoro-platform`) no tiene autorizada la GitHub App de Vercel, así que el proyecto de Vercel no se pudo conectar al repo — cada deploy a producción hay que dispararlo a mano (`vercel --prod`). Kevin tiene que instalar/autorizar la app de Vercel (https://github.com/apps/vercel) sobre este repo. Ver DEC-028.
- ⚠️ **Kevin (no bloqueante):** el trigger `handle_new_user` solo lee `full_name` de `raw_user_meta_data`. `RegisterForm.tsx` ya manda `dni`, `phone` y `city` en el signup, pero esos datos se pierden porque el trigger no los captura — el usuario los reingresa una vez en `/completar-perfil`. Actualizar `supabase/migrations/20260615000001_handle_new_user.sql` (o migración nueva) para leer e insertar también esos 3 campos en `profiles` y evitar el paso duplicado. Ver DEC-019/DEC-020.

## Integración pendiente (Fran reemplaza mocks por datos reales)
- ~~Carta pública → endpoints productos, categorías, time_offers, promotions~~ ✅ integrada
- ~~Perfil cliente → `/rest/v1/points_balance` y `/rest/v1/points_transactions`~~ ✅ integrada (desde 30 jun, commit `f9b0a5d`)
- ~~Vista cajero → Edge Fn `register-consumption`~~ ✅ integrada — probada en vivo el 26 jul (Flujo 6 del QA), sin mocks.
- ~~Dashboard → Edge Fn `reports`~~ ✅ integrado
- ~~División de cuenta → Edge Fn `split-consumption`~~ ✅ integrada

**No quedan mocks pendientes de reemplazo.** Todas las vistas de cliente, cajero y admin están conectadas a datos reales.

## Pendientes del cliente (Restaurante Isidoro)
- [ ] Fotos de todos los productos del menú (falta además que Kevin configure Supabase Storage para poder subirlas)
- [x] Nombre, descripción y precio de cada producto — cargados 140 productos reales el 26 jul 2026, extraídos de https://monline.com.ar/Isidoro (su carta actual en otra plataforma). Reemplazó por completo los datos placeholder. Falta el precio de 1 producto ("Provoleta de la Huerta") que no estaba visible en la fuente — confirmar con el cliente y cargarlo.
- [x] Categorías del menú — 12 categorías reales cargadas (Entradas, Entre Panes, Hamburguesas, Pizzas, Ensaladas, Platos Principales, Postres, Bebidas sin Alcohol, Coctelería, Cervezas, Vinos, Espumantes), reemplazando las 5 de prueba.
- [ ] Datos del administrador principal (email para crear cuenta admin)
- [ ] Dominio web contratado y apuntado

## Decisiones tomadas
_Ver DECISIONS.md_

---

## Leyenda de estado
| Símbolo | Significado |
|---|---|
| ⬜ Pendiente | No iniciado |
| 🔄 En progreso | En desarrollo activo |
| ✅ Completado | Terminado y testeado |
| 🔴 Bloqueado | Esperando dependencia |
| ⚠️ Riesgo | Requiere atención especial |