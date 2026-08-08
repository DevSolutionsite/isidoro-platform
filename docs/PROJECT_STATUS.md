# PROJECT_STATUS.md — Plataforma Isidoro
> Actualizar al iniciar y cerrar cada jornada. El CTO Agent lee este archivo antes de responder cualquier pregunta.

**Última actualización:** 8 de agosto de 2026 — Fran (points_per_peso ajustado a 0.1 + UI de edición en `/admin/inicio`, segundo pedido resuelto de la reunión con el cliente del 8 de agosto, ver DEC-038)
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
| Sistema de pedidos por WhatsApp desde `/carta` | Fran | ✅ Completado | Botón "Hacer un pedido" en el menú hamburguesa (debajo de "Hacé tu reserva aquí") abre un modal wizard de 3 pasos: elegir productos (buscador + steppers de cantidad), datos del cliente (nombre, modalidad retiro/delivery, dirección condicional, método de pago), y confirmación que arma el mensaje y abre WhatsApp al mismo número de reservas (`RESTAURANT_WHATSAPP_NUMBER` en `src/lib/constants.ts`, reutilizada — no duplicada). 100% client-side, sin persistencia en Supabase, no requiere login, no toca puntos/consumptions ni ningún otro módulo. Ver DEC-030. |
| Pedidos por WhatsApp: 5 métodos de pago + regla condicional | Fran | ✅ Completado | Método de pago ampliado de 2 a 5 opciones (Efectivo, Transferencia, QR, Débito, Crédito) en grid de 2 columnas. Débito y Crédito quedan deshabilitados (visual + funcionalmente) cuando la modalidad es Delivery, con aviso rojo "Opción válida únicamente para retiro"; si estaban seleccionados y el cliente cambia a Delivery, el método se resetea a Efectivo automáticamente. Mapa de labels compartido (`PAYMENT_METHOD_LABELS`) usado en el form, el resumen y el mensaje de WhatsApp. Ver DEC-031. |
| Sección admin "Inicio" (imágenes del hero + horarios) | Fran | ✅ Completado | Planificado en DEC-031 (tabla `site_content` + bucket `hero-images`, migración `20260805190000_site_content.sql`). Migración corrida y frontend completo (`/admin/inicio`, `AddHeroImageForm`, `HeroImageThumb`, Server Actions en `admin-site-content.ts`, `HeroCarousel` dinámico) — implementado en otra sesión/máquina, traído a `feature/frontend` el 6 de agosto vía merge de `main`. |
| Fix: padding faltante en `/admin/estadisticas` | Fran | ✅ Completado | El rediseño de Estadísticas (commit `19d8554`, otra sesión) no envolvía el contenido en el wrapper `px-8 py-6` que usan el resto de las páginas del admin (`productos`, `categorías`, `inicio`, `consumos`) — las cards de KPIs, el gráfico y las tablas quedaban pegadas a los bordes del viewport. Agregado el wrapper faltante. Ver DEC-033. |
| Quitar botón de YouTube de la landing | Fran | ✅ Completado | `SocialFooter.tsx`: sacado `youtube` de `SOCIAL_LINKS`/`SOCIAL_ITEMS` y el ícono sin uso. El link estaba en `PENDIENTE_LINK_YOUTUBE` (nunca se cargó uno real). Quedan WhatsApp, Facebook, Instagram. Ver DEC-033. |
| Fix: gap debajo del contenedor de imagen en cards de `/carta` | Fran | ✅ Completado | Causa raíz encontrada con la captura que pasó el usuario: el `<article>` de `ProductCard.tsx` es un flex row sin `items-center`, así que la caja de imagen/placeholder (108px fijo) quedaba pegada arriba (`flex-start` implícito) en vez de centrada verticalmente — visible como una franja vacía debajo en cards cuya fila crece más de 108px por texto. Fix: agregado `items-center` al `<article>`. Verificado en navegador (antes/después) contra `Lomo Clásico`. Ver DEC-034. |
| Logo real en navbar + favicon | Fran | ✅ Completado | `IsidoroLogo.tsx` (usado en los 6 navbars de la app: carta, home, admin, cajero, cliente) pasa del SVG dibujado a mano a `logo1.png` (provisto por el usuario, copiado a `public/`) vía `next/image`. Favicon reemplazado por `logo2.png` (marca sin wordmark) como `src/app/icon.png`, convención de Next.js App Router — se borró el `favicon.ico` default de Next para no dejar dos íconos compitiendo. Verificado que ambos PNG son transparentes (calzan sobre el verde de la app) antes de integrarlos. Ver DEC-034. |
| Fix: subida de imágenes fallaba arriba de 1MB | Fran | ✅ Completado | Cliente reportó no poder subir imágenes de más de 1MB pese al límite de 5MB del bucket. Diagnóstico confirmó que el bucket (5MB, verificado en vivo vía Storage API) y la validación client-side (5MB en `ProductForm.tsx`) estaban bien — la causa real era que Next.js limita el body de una Server Action a 1MB por defecto, nunca configurado en `next.config.ts`. Mismo bug latente en la subida de imágenes del hero (`admin-site-content.ts`). Fix: `experimental.serverActions.bodySizeLimit: '6mb'` en `next.config.ts` — corrige ambos flujos de subida con un solo cambio. Ver DEC-035. |
| Gestión de recompensas en el admin (`/admin/recompensas`) | Fran | ✅ Completado | Primer pedido resuelto de los 5 de la reunión con el cliente del 8 de agosto (ver DEC-036, punto 3). Nunca había existido UI de gestión de `rewards` — nueva sección con el mismo patrón que `promociones` (sin `deleted_at`, "Eliminar" = `is_active: false`): listado, alta y edición, Server Actions en `admin-rewards.ts`, link nuevo en `AdminNav.tsx`. RLS ya permitía la escritura a `rewards` con la misma policy que `products`/`categories` — verificado en vivo antes de codear (login real como admin + POST/PATCH/DELETE de prueba contra producción, sin cambios de Kevin) y de nuevo end-to-end en el navegador después de codear (crear → editar → desactivar, con limpieza de la fila de prueba). Contrato de escritura agregado a `API_CONTRACTS.md` (nunca documentado por Kevin). |
| Puntos automáticos al 10% de la compra | Fran | ✅ Completado | Segundo pedido de la reunión del 8 de agosto (ver DEC-036 punto 2, cerrado en DEC-038). `settings.points_per_peso` estaba en `1.0` (100%), sin ningún campo editable en el admin. Agregada `updatePointsPerPeso` (mismo patrón que `updateMaxConsumptionAmount`) + sección nueva en `/admin/inicio`. Cambiado a `0.1` usando la UI nueva, verificado en el navegador y confirmado en la DB. Nota de comportamiento documentada en DEC-038: con `floor(amount * points_per_peso)`, consumos menores a $10 acreditan 0 puntos. |

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