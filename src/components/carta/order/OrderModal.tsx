'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Category, ProductWithDiscount } from '@/lib/types'
import { ProductPicker } from './ProductPicker'
import { CustomerForm } from './CustomerForm'
import { OrderReview } from './OrderReview'
import { effectivePrice, type OrderCartLine, type OrderCustomerData } from './buildOrderMessage'

interface OrderModalProps {
  categories: Pick<Category, 'id' | 'name' | 'parent_category_id'>[]
  products: ProductWithDiscount[]
  onClose: () => void
}

const INITIAL_CUSTOMER: OrderCustomerData = {
  name: '',
  modality: 'retiro',
  address: '',
  payment: 'efectivo',
}

const STEP_TITLES = {
  1: 'Elegí tus productos',
  2: 'Tus datos',
  3: 'Confirmá tu pedido',
} as const

export function OrderModal({ categories, products, onClose }: OrderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [cart, setCart] = useState<OrderCartLine[]>([])
  const [customer, setCustomer] = useState<OrderCustomerData>(INITIAL_CUSTOMER)

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0)
  const cartTotal = cart.reduce((sum, l) => {
    const p = productsById.get(l.productId)
    return p ? sum + effectivePrice(p) * l.quantity : sum
  }, 0)

  function addToCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { productId, quantity: 1 }]
    })
  }

  function decrementQty(productId: string) {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    )
  }

  function handleClose() {
    if (cartCount > 0 && !window.confirm('¿Descartar el pedido?')) return
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--background)' }}>
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        <header
          className="flex shrink-0 items-center gap-3 border-b px-4 py-4"
          style={{ borderColor: 'var(--border)' }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              aria-label="Volver al paso anterior"
              className="rounded-md p-1 transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-muted)' }}
            >
              <BackIcon />
            </button>
          ) : (
            <span className="block h-7 w-7" aria-hidden="true" />
          )}

          <p
            className="flex-1 text-center text-base font-semibold font-display"
            style={{ color: 'var(--foreground)' }}
          >
            {STEP_TITLES[step]}
          </p>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="rounded-md p-1 transition-opacity hover:opacity-60"
            style={{ color: 'var(--text-muted)' }}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-hidden">
          {step === 1 && (
            <ProductPicker
              categories={categories}
              products={products}
              cart={cart}
              cartCount={cartCount}
              cartTotal={cartTotal}
              onAdd={addToCart}
              onIncrement={addToCart}
              onDecrement={decrementQty}
              onContinue={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <CustomerForm
              customer={customer}
              onChange={setCustomer}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <OrderReview
              cart={cart}
              productsById={productsById}
              customer={customer}
              onBack={() => setStep(2)}
              onSent={onClose}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
