'use client'

import { formatARS } from '@/lib/utils'
import type { ProductWithDiscount } from '@/lib/types'
import {
  buildOrderMessage,
  buildWhatsAppOrderUrl,
  effectivePrice,
  PAYMENT_METHOD_LABELS,
  type OrderCartLine,
  type OrderCustomerData,
} from './buildOrderMessage'

interface OrderReviewProps {
  cart: OrderCartLine[]
  productsById: Map<string, ProductWithDiscount>
  customer: OrderCustomerData
  onBack: () => void
  onSent: () => void
}

export function OrderReview({ cart, productsById, customer, onBack, onSent }: OrderReviewProps) {
  const message = buildOrderMessage(cart, productsById, customer)
  const waUrl = buildWhatsAppOrderUrl(message)

  const total = cart.reduce((sum, line) => {
    const product = productsById.get(line.productId)
    return product ? sum + effectivePrice(product) * line.quantity : sum
  }, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div>
          <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Productos
          </p>
          <ul className="space-y-2">
            {cart.map((line) => {
              const product = productsById.get(line.productId)
              if (!product) return null
              return (
                <li key={line.productId} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--foreground)' }}>
                    {line.quantity}x {product.name}
                  </span>
                  <span className="tabular-nums font-semibold" style={{ color: 'var(--brand)' }}>
                    {formatARS(effectivePrice(product) * line.quantity)}
                  </span>
                </li>
              )
            })}
          </ul>
          <div
            className="mt-3 flex items-center justify-between border-t pt-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Total
            </span>
            <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--brand)' }}>
              {formatARS(total)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-sm" style={{ color: 'var(--foreground)' }}>
          <p>
            <span style={{ color: 'var(--text-muted)' }}>Nombre: </span>
            {customer.name}
          </p>
          <p>
            <span style={{ color: 'var(--text-muted)' }}>Modalidad: </span>
            {customer.modality === 'delivery' ? 'Delivery' : 'Retiro en el local'}
          </p>
          {customer.modality === 'delivery' && (
            <p>
              <span style={{ color: 'var(--text-muted)' }}>Dirección: </span>
              {customer.address}
            </p>
          )}
          <p>
            <span style={{ color: 'var(--text-muted)' }}>Método de pago: </span>
            {PAYMENT_METHOD_LABELS[customer.payment]}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface-alt)', color: 'var(--foreground)' }}
        >
          Atrás
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onSent}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-wide transition-opacity hover:opacity-90"
          style={{ background: '#25D366', color: '#fff' }}
        >
          <WhatsAppIcon />
          Enviar pedido
        </a>
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.484 1.34 5.002L2 22l5.116-1.334a9.96 9.96 0 0 0 4.888 1.28h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.671-1.04-5.182-2.929-7.071a9.935 9.935 0 0 0-7.072-2.875zm5.85 15.847a8.28 8.28 0 0 1-5.85 2.423h-.003a8.284 8.284 0 0 1-4.223-1.155l-.303-.18-3.037.792.811-2.96-.198-.304a8.264 8.264 0 0 1-1.267-4.42c0-4.582 3.73-8.312 8.315-8.312a8.26 8.26 0 0 1 5.877 2.435 8.259 8.259 0 0 1 2.435 5.877 8.285 8.285 0 0 1-2.557 5.804z" />
    </svg>
  )
}
