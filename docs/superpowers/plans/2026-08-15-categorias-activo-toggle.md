# Activar/Desactivar Categorías y Subcategorías en la Carta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el punto 5 de DEC-036 — dar al admin un toggle "Activa" por categoría/subcategoría en `/admin/categorias` que oculta esa fila de `/carta` (y del picker de pedidos por WhatsApp) sin borrarla ni afectar a las demás filas.

**Architecture:** La columna `categories.is_active` ya existe en producción (migración `20260810180000_categories_is_active.sql`, confirmada corrida por Kevin) pero nunca se conectó al código — ni el tipo TypeScript, ni el admin, ni el filtrado de `/carta` la usan hoy. Este plan: (1) agrega el campo al tipo generado, (2) agrega un server action + toggle inline en la tabla de `/admin/categorias`, (3) calcula en `/carta/page.tsx` una lista de categorías visibles (activas, con "promoción de huérfanas" cuando el padre está inactivo pero la subcategoría no) y la pasa a los tres consumidores existentes (render principal, `CategoryMenu`, `ProductPicker` vía `OrderModal`) sin tocar el código interno de esos dos últimos, y (4) suma `is_active` (sin cascada al padre) a la elegibilidad de delivery ya existente.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Supabase (`@supabase/ssr`), TypeScript, Tailwind inline styles (custom properties del theme). Sin framework de testing — verificación real del proyecto es `tsc --noEmit` + `eslint` + `next build` + prueba manual en el navegador contra producción (mismo patrón que DEC-037/038 en `docs/DECISIONS.md`).

---

### Task 1: Agregar `is_active` al tipo de `categories`

**Files:**
- Modify: `src/lib/types/database.types.ts:62-91`

- [ ] **Step 1: Agregar el campo a `Row`, `Insert` y `Update`**

Reemplazar el bloque `categories` completo:

```ts
      categories: {
        Row: {
          id: string
          name: string
          sort_order: number
          parent_category_id: string | null
          available_for_delivery: boolean
          is_active: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          parent_category_id?: string | null
          available_for_delivery?: boolean
          is_active?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          sort_order?: number
          parent_category_id?: string | null
          available_for_delivery?: boolean
          is_active?: boolean
          deleted_at?: string | null
          updated_at?: string
        }
      }
```

- [ ] **Step 2: Verificar que no rompe el build de tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `categories` (puede haber ruido preexistente no relacionado; si lo hay, confirmar que ya existía antes de este cambio con `git stash` + rerun).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/database.types.ts
git commit -m "fix: agregar is_active (faltante) al tipo generado de categories"
```

---

### Task 2: Server action `toggleCategoryActive`

**Files:**
- Modify: `src/lib/actions/admin-categories.ts`

- [ ] **Step 1: Agregar la función al final del archivo**

Mismo patrón que `deleteCategory` en el mismo archivo (sin `requireAdmin` explícito — ninguna otra acción de este archivo lo tiene, ver DEC-043 nota de hardening pendiente no bloqueante):

```ts
export async function toggleCategoryActive(
  id: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ is_active: active })
    .eq('id', id)
  if (error) return { ok: false, code: error.message }

  revalidateTag('categories', { expire: 0 })
  return { ok: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/admin-categories.ts
git commit -m "feat: server action toggleCategoryActive"
```

---

### Task 3: Componente `CategoryActiveToggle`

**Files:**
- Create: `src/components/admin/CategoryActiveToggle.tsx`

- [ ] **Step 1: Crear el componente**

Mismo patrón de actualización optimista + reversión que `DeliveryTree.tsx` (`handleToggleCategory`), pero como checkbox aislado en vez de árbol:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toggleCategoryActive } from '@/lib/actions/admin-categories'

interface CategoryActiveToggleProps {
  categoryId: string
  initialActive: boolean
  categoryName: string
}

export function CategoryActiveToggle({
  categoryId,
  initialActive,
  categoryName,
}: CategoryActiveToggleProps) {
  const [active, setActive] = useState(initialActive)
  const [, startTransition] = useTransition()

  function handleChange(next: boolean) {
    const prev = active
    setActive(next)
    startTransition(async () => {
      const result = await toggleCategoryActive(categoryId, next)
      if (!result.ok) setActive(prev)
    })
  }

  return (
    <label
      className="inline-flex items-center gap-2 text-xs"
      style={{ color: 'var(--text-muted)' }}
    >
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 rounded accent-brand"
        aria-label={`Activa en la carta: ${categoryName}`}
      />
      Activa
    </label>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/CategoryActiveToggle.tsx
git commit -m "feat: componente CategoryActiveToggle"
```

---

### Task 4: Columna "Activo" en `/admin/categorias`

**Files:**
- Modify: `src/app/(admin)/admin/categorias/page.tsx`

No hace falta tocar la query (`.select('*')` ya trae `is_active` de la DB real; solo faltaba el tipo, resuelto en Task 1).

- [ ] **Step 1: Importar el componente**

En `src/app/(admin)/admin/categorias/page.tsx`, agregar el import junto a los demás:

```ts
import { CategoryActiveToggle } from '@/components/admin/CategoryActiveToggle'
```

- [ ] **Step 2: Agregar el `<th>` de cabecera**

Ubicar el bloque de cabecera actual (dentro de `<thead><tr>`):

```tsx
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Productos
                </th>
```

Agregar inmediatamente después, antes del `<th>` de "Acciones":

```tsx
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Activo
                </th>
```

- [ ] **Step 3: Agregar la celda en cada fila**

Ubicar la celda de conteo de productos dentro de `rows.map`:

```tsx
                  <td className="px-4 py-3 text-center tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {isSub ? directCountMap[cat.id] ?? 0 : totalCount(cat.id)}
                  </td>
```

Agregar inmediatamente después, antes de la celda de "Acciones":

```tsx
                  <td className="px-4 py-3 text-center">
                    <CategoryActiveToggle
                      categoryId={cat.id}
                      initialActive={cat.is_active}
                      categoryName={cat.name}
                    />
                  </td>
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/admin/categorias/page.tsx"
git commit -m "feat: toggle Activa inline en tabla de /admin/categorias"
```

---

### Task 5: Filtrado en `/carta` (render, menú, picker de pedidos) + cruce con delivery

**Files:**
- Modify: `src/app/(public)/carta/page.tsx`

- [ ] **Step 1: Calcular `visibleCategories` con promoción de huérfanas**

Ubicar la línea actual (justo después del `Promise.all`):

```ts
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]))
```

Agregar inmediatamente después:

```ts
  // Categorías/subcategorías is_active independiente por fila (sin cascada,
  // DEC-044): si el padre está inactivo pero la subcategoría no, la
  // subcategoría se "desengancha" (parent_category_id -> null) y se renderiza
  // como su propia sección de nivel superior en vez de desaparecer con el
  // padre.
  const activeCategories = (categories ?? []).filter((c) => c.is_active)
  const activeCategoryIds = new Set(activeCategories.map((c) => c.id))
  const visibleCategories = activeCategories.map((c) =>
    c.parent_category_id && !activeCategoryIds.has(c.parent_category_id)
      ? { ...c, parent_category_id: null }
      : c,
  )
```

- [ ] **Step 2: Sumar `is_active` (propio, sin cascada) a `isDeliveryEligible`**

Ubicar:

```ts
  function isDeliveryEligible(p: { category_id: string; available_for_delivery: boolean }): boolean {
    if (!p.available_for_delivery) return false
    const category = categoriesById.get(p.category_id)
    if (!category || !category.available_for_delivery) return false
    if (category.parent_category_id) {
      const parent = categoriesById.get(category.parent_category_id)
      if (!parent || !parent.available_for_delivery) return false
    }
    return true
  }
```

Reemplazar la línea del chequeo de categoría propia:

```ts
  function isDeliveryEligible(p: { category_id: string; available_for_delivery: boolean }): boolean {
    if (!p.available_for_delivery) return false
    const category = categoriesById.get(p.category_id)
    if (!category || !category.available_for_delivery || !category.is_active) return false
    if (category.parent_category_id) {
      const parent = categoriesById.get(category.parent_category_id)
      if (!parent || !parent.available_for_delivery) return false
    }
    return true
  }
```

(Nota: `is_active` del padre NO se chequea acá — sin cascada, mismo criterio que el render público.)

- [ ] **Step 3: Usar `visibleCategories` en `CategoryMenu`**

Ubicar:

```tsx
          <CategoryMenu categories={categories ?? []} products={productsWithDiscount} />
```

Reemplazar por:

```tsx
          <CategoryMenu categories={visibleCategories} products={productsWithDiscount} />
```

- [ ] **Step 4: Usar `visibleCategories` en el render principal de secciones**

Ubicar:

```tsx
        {(categories ?? [])
          .filter((category) => !category.parent_category_id)
          .map((category) => {
            const subcategories = (categories ?? []).filter(
              (c) => c.parent_category_id === category.id,
            )
```

Reemplazar por:

```tsx
        {visibleCategories
          .filter((category) => !category.parent_category_id)
          .map((category) => {
            const subcategories = visibleCategories.filter(
              (c) => c.parent_category_id === category.id,
            )
```

- [ ] **Step 5: Verificar tipos, lint y build**

Run: `npx tsc --noEmit`
Expected: sin errores.

Run: `npm run lint`
Expected: `No ESLint warnings or errors` (o salida limpia equivalente).

Run: `npm run build`
Expected: build exitoso, las mismas ~32 rutas que ya compilaban antes (sin rutas nuevas — no se agregó ninguna página).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/carta/page.tsx"
git commit -m "feat: /carta respeta categories.is_active (con subcategorias independientes) y lo cruza con delivery"
```

---

### Task 6: Verificación end-to-end en el navegador (contra producción, con reversión)

No hay entorno de staging — se verifica contra la misma base que ya usa `/admin/delivery` (ver deploy previo). Elegir una categoría de bajo tráfico para minimizar la ventana en la que un cliente real podría no verla.

- [ ] **Step 1: Deploy a preview (no producción todavía)**

Run: `vercel deploy` (sin `--prod`)
Expected: URL de preview `https://isidoro-platform-<hash>-franchos-projects-a68a206d.vercel.app` con status Ready.

- [ ] **Step 2: En el preview, entrar a `/admin/categorias` logueado como admin**

Confirmar que aparece la columna "Activo" con el checkbox tildado en todas las filas (estado real actual: todo `is_active = true` por default de la migración).

- [ ] **Step 3: Desactivar una subcategoría de bajo tráfico y confirmar que desaparece de `/carta`**

Destildar el checkbox de una subcategoría (ej. la que tenga menos productos). Abrir `/carta` en otra pestaña del mismo preview y confirmar que esa subcategoría y sus productos ya no aparecen, sin afectar al resto de su categoría padre ni a otras secciones.

- [ ] **Step 4: Confirmar el caso de independencia (subcategoría activa con padre inactivo)**

Desactivar una categoría de nivel superior que tenga una subcategoría todavía activa. Confirmar en `/carta` que la subcategoría se sigue mostrando como su propia sección (sin el título del padre), y que el resto de las categorías del padre (productos propios, si tenía) desaparecieron.

- [ ] **Step 5: Confirmar el cruce con delivery**

Con la subcategoría del Step 3 todavía desactivada, abrir el flujo "Hacer un pedido" en `/carta` y confirmar que sus productos tampoco aparecen ahí (aunque `available_for_delivery` siga en `true` para ellos).

- [ ] **Step 6: Revertir todos los toggles usados en la prueba**

Volver a tildar cada checkbox tocado en los Steps 3 y 4. Confirmar en `/carta` que todo vuelve a verse exactamente como antes de empezar la prueba.

- [ ] **Step 7: Deploy a producción**

Run: `vercel deploy --prod`
Expected: alias `isidoro-platform.vercel.app` actualizado, status Ready.

---

### Task 7: Documentar en `docs/DECISIONS.md`

**Files:**
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Agregar la entrada `DEC-044` después de `DEC-043`**

Seguir el mismo formato que `DEC-037`/`DEC-038` (contexto/diseño, archivos, verificación, tomada por, fecha). Insertar antes de la línea `## System Prompts de los agentes`:

```markdown
### DEC-044 — Frontend de `categories.is_active` conectado: toggle en admin + filtro en `/carta` (cierra el punto 5 de DEC-036, cierra DEC-042)

- **Contexto:** DEC-042 dejó escrita la migración de `is_active` pero deliberadamente sin conectar del lado del frontend, a la espera de que Kevin la corriera en producción (riesgo concreto: filtrar contra una columna inexistente hubiera ocultado toda la carta). Kevin confirmó que ya la corrió — se procede a conectar el resto.
- **Diseño:**
  - **Sin cascada entre niveles:** desactivar una categoría de nivel superior NO oculta a sus subcategorías activas — cada fila decide su propia visibilidad de forma independiente. Si una subcategoría queda "huérfana visible" (activa, con el padre inactivo), se renderiza como su propia sección de nivel superior en `/carta`, sin el título del padre.
  - **Cruce con delivery:** un producto solo es elegible para pedido por WhatsApp si, además de lo que ya exigía `available_for_delivery` (con su cascada existente al padre, sin cambios), su categoría propia tiene `is_active = true` — sin cascada al padre, mismo criterio de independencia que en `/carta`.
- **Archivos nuevos:** `src/components/admin/CategoryActiveToggle.tsx`.
- **Archivos editados:** `src/lib/types/database.types.ts` (tipo `categories` con `is_active`, faltante desde que se corrió la migración de DEC-042), `src/lib/actions/admin-categories.ts` (`toggleCategoryActive`), `src/app/(admin)/admin/categorias/page.tsx` (columna "Activo"), `src/app/(public)/carta/page.tsx` (`visibleCategories` con promoción de huérfanas, usado en el render principal y pasado a `CategoryMenu`/`ProductPicker` sin tocar el código de esos dos componentes; `isDeliveryEligible` extendido).
- **Verificado antes de producción:** `tsc --noEmit` y `eslint` limpios, `next build` compila las mismas rutas de siempre. Probado en un deploy preview (no directo a producción): desactivar una subcategoría de bajo tráfico la oculta de `/carta` y del picker de pedidos sin afectar al resto; desactivar una categoría padre con una subcategoría activa deja a esa subcategoría visible como sección propia. Todos los toggles de la prueba se revirtieron antes de promover a producción.
- **Tomada por:** Fran (Frontend Agent) — pedido directo del usuario, plan revisado y aprobado antes de codear.
- **Fecha:** 15 de agosto de 2026

---

```

- [ ] **Step 2: Commit**

```bash
git add docs/DECISIONS.md
git commit -m "docs: DEC-044 - is_active de categorias conectado (cierra DEC-036 punto 5)"
```

---

## Resumen de archivos tocados

- `src/lib/types/database.types.ts` — tipo
- `src/lib/actions/admin-categories.ts` — server action
- `src/components/admin/CategoryActiveToggle.tsx` — nuevo componente
- `src/app/(admin)/admin/categorias/page.tsx` — UI admin
- `src/app/(public)/carta/page.tsx` — filtrado público + cruce con delivery
- `docs/DECISIONS.md` — DEC-044

Sin migración nueva (columna ya existe y ya está aplicada en producción). Sin cambios de RLS (las policies existentes de `categories` ya cubren cualquier columna de la fila, confirmado en la migración original).
