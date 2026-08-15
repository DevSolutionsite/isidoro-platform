'use client'

import { useMemo, useState, useTransition } from 'react'
import { toggleCategoryDelivery, toggleProductDelivery } from '@/lib/actions/admin-delivery'

type TreeCategory = {
  id: string
  name: string
  parent_category_id: string | null
  available_for_delivery: boolean
}

type TreeProduct = {
  id: string
  name: string
  category_id: string
  available_for_delivery: boolean
}

interface DeliveryTreeProps {
  categories: TreeCategory[]
  products: TreeProduct[]
}

export function DeliveryTree({ categories, products }: DeliveryTreeProps) {
  const [catAvail, setCatAvail] = useState<Map<string, boolean>>(
    () => new Map(categories.map((c) => [c.id, c.available_for_delivery])),
  )
  const [prodAvail, setProdAvail] = useState<Map<string, boolean>>(
    () => new Map(products.map((p) => [p.id, p.available_for_delivery])),
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const topLevel = useMemo(
    () => categories.filter((c) => !c.parent_category_id),
    [categories],
  )
  const subcatsByParent = useMemo(() => {
    const map = new Map<string, TreeCategory[]>()
    for (const c of categories) {
      if (!c.parent_category_id) continue
      const list = map.get(c.parent_category_id) ?? []
      list.push(c)
      map.set(c.parent_category_id, list)
    }
    return map
  }, [categories])
  const productsByCategory = useMemo(() => {
    const map = new Map<string, TreeProduct[]>()
    for (const p of products) {
      const list = map.get(p.category_id) ?? []
      list.push(p)
      map.set(p.category_id, list)
    }
    return map
  }, [products])

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleToggleCategory(categoryId: string, next: boolean) {
    const prevValue = catAvail.get(categoryId) ?? true
    setCatAvail((prev) => new Map(prev).set(categoryId, next))
    startTransition(async () => {
      const result = await toggleCategoryDelivery(categoryId, next)
      if (!result.ok) {
        setCatAvail((prev) => new Map(prev).set(categoryId, prevValue))
      }
    })
  }

  function handleToggleProduct(productId: string, next: boolean) {
    const prevValue = prodAvail.get(productId) ?? true
    setProdAvail((prev) => new Map(prev).set(productId, next))
    startTransition(async () => {
      const result = await toggleProductDelivery(productId, next)
      if (!result.ok) {
        setProdAvail((prev) => new Map(prev).set(productId, prevValue))
      }
    })
  }

  if (topLevel.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        No hay categorías.
      </p>
    )
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border)' }}
    >
      {topLevel.map((cat, i) => {
        const subcats = subcatsByParent.get(cat.id) ?? []
        const ownProducts = productsByCategory.get(cat.id) ?? []
        const hasChildren = subcats.length > 0 || ownProducts.length > 0
        const isExpanded = expanded.has(cat.id)
        const catOwnAvailable = catAvail.get(cat.id) ?? true

        return (
          <div key={cat.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
            <TreeRow
              name={cat.name}
              indent={0}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggleExpanded={() => toggleExpanded(cat.id)}
              available={catOwnAvailable}
              onToggleAvailable={(next) => handleToggleCategory(cat.id, next)}
            />

            {isExpanded && (
              <>
                {ownProducts.map((p) => (
                  <TreeRow
                    key={p.id}
                    name={p.name}
                    indent={1}
                    hasChildren={false}
                    available={prodAvail.get(p.id) ?? true}
                    onToggleAvailable={(next) => handleToggleProduct(p.id, next)}
                    ineffective={!catOwnAvailable && (prodAvail.get(p.id) ?? true)}
                  />
                ))}

                {subcats.map((sub) => {
                  const subProducts = productsByCategory.get(sub.id) ?? []
                  const subExpanded = expanded.has(sub.id)
                  const subOwnAvailable = catAvail.get(sub.id) ?? true
                  return (
                    <div key={sub.id}>
                      <TreeRow
                        name={sub.name}
                        indent={1}
                        hasChildren={subProducts.length > 0}
                        isExpanded={subExpanded}
                        onToggleExpanded={() => toggleExpanded(sub.id)}
                        available={subOwnAvailable}
                        onToggleAvailable={(next) => handleToggleCategory(sub.id, next)}
                        ineffective={!catOwnAvailable && subOwnAvailable}
                      />
                      {subExpanded &&
                        subProducts.map((p) => (
                          <TreeRow
                            key={p.id}
                            name={p.name}
                            indent={2}
                            hasChildren={false}
                            available={prodAvail.get(p.id) ?? true}
                            onToggleAvailable={(next) => handleToggleProduct(p.id, next)}
                            ineffective={
                              (!catOwnAvailable || !subOwnAvailable) &&
                              (prodAvail.get(p.id) ?? true)
                            }
                          />
                        ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TreeRow({
  name,
  indent,
  hasChildren,
  isExpanded,
  onToggleExpanded,
  available,
  onToggleAvailable,
  ineffective,
}: {
  name: string
  indent: 0 | 1 | 2
  hasChildren: boolean
  isExpanded?: boolean
  onToggleExpanded?: () => void
  available: boolean
  onToggleAvailable: (next: boolean) => void
  ineffective?: boolean
}) {
  const paddingLeft = 16 + indent * 24

  return (
    <div
      className="flex items-center gap-3 py-2.5 pr-4"
      style={{ paddingLeft, background: 'var(--background)' }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-label={isExpanded ? 'Contraer' : 'Expandir'}
          aria-expanded={isExpanded}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-opacity hover:opacity-60"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      ) : (
        <span className="h-6 w-6 shrink-0" aria-hidden="true" />
      )}

      <span
        className="min-w-0 flex-1 truncate text-sm"
        style={{
          color: 'var(--foreground)',
          fontWeight: indent === 0 ? 600 : 400,
        }}
      >
        {name}
      </span>

      {ineffective && (
        <span
          className="shrink-0 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Sin efecto — categoría desactivada
        </span>
      )}

      <label className="flex shrink-0 items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => onToggleAvailable(e.target.checked)}
          className="h-4 w-4 rounded accent-brand"
          aria-label={`Disponible para delivery: ${name}`}
        />
        Delivery
      </label>
    </div>
  )
}
