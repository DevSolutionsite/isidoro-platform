'use client'

import { useMemo, useState } from 'react'
import { formatARS } from '@/lib/utils'
import type { Category, ProductWithDiscount } from '@/lib/types'
import { effectivePrice, type OrderCartLine } from './buildOrderMessage'

interface ProductPickerProps {
  categories: Pick<Category, 'id' | 'name'>[]
  products: ProductWithDiscount[]
  cart: OrderCartLine[]
  cartCount: number
  cartTotal: number
  onAdd: (productId: string) => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onContinue: () => void
}

export function ProductPicker({
  categories,
  products,
  cart,
  cartCount,
  cartTotal,
  onAdd,
  onIncrement,
  onDecrement,
  onContinue,
}: ProductPickerProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  const qtyById = useMemo(
    () => new Map(cart.map((line) => [line.productId, line.quantity])),
    [cart],
  )

  const groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: products.filter(
            (p) =>
              p.category_id === category.id &&
              (normalizedQuery === '' || p.name.toLowerCase().includes(normalizedQuery)),
          ),
        }))
        .filter((g) => g.items.length > 0),
    [categories, products, normalizedQuery],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pt-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {groups.length === 0 ? (
          <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No encontramos productos con ese nombre.
          </p>
        ) : (
          groups.map(({ category, items }) => (
            <div key={category.id} className="mb-6">
              <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                {category.name}
              </h3>
              <ul className="space-y-2">
                {items.map((product) => {
                  const qty = qtyById.get(product.id) ?? 0
                  return (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {product.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--brand)' }}>
                          {formatARS(effectivePrice(product))}
                        </p>
                      </div>
                      <QuantityControl
                        qty={qty}
                        onAdd={() => onAdd(product.id)}
                        onIncrement={() => onIncrement(product.id)}
                        onDecrement={() => onDecrement(product.id)}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {cartCount > 0 && (
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <span className="text-sm" style={{ color: 'var(--foreground)' }}>
            {cartCount} {cartCount === 1 ? 'producto' : 'productos'} · {formatARS(cartTotal)}
          </span>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  )
}

function QuantityControl({
  qty,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  qty: number
  onAdd: () => void
  onIncrement: () => void
  onDecrement: () => void
}) {
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        aria-label="Agregar"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold transition-opacity hover:opacity-80"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        +
      </button>
    )
  }
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Quitar uno"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold transition-opacity hover:opacity-80"
        style={{
          background: 'var(--surface-alt)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        }}
      >
        −
      </button>
      <span
        className="w-4 text-center text-sm font-semibold tabular-nums"
        style={{ color: 'var(--foreground)' }}
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Agregar uno"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold transition-opacity hover:opacity-80"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        +
      </button>
    </div>
  )
}
