'use client'

import type { OrderCustomerData } from './buildOrderMessage'

interface CustomerFormProps {
  customer: OrderCustomerData
  onChange: (data: OrderCustomerData) => void
  onBack: () => void
  onContinue: () => void
}

export function CustomerForm({ customer, onChange, onBack, onContinue }: CustomerFormProps) {
  const canContinue =
    customer.name.trim().length > 0 &&
    (customer.modality === 'retiro' || customer.address.trim().length > 0)

  function update<K extends keyof OrderCustomerData>(key: K, value: OrderCustomerData[K]) {
    onChange({ ...customer, [key]: value })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div>
          <label
            htmlFor="order-name"
            className="mb-1.5 block text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Nombre *
          </label>
          <input
            id="order-name"
            type="text"
            required
            value={customer.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-colors"
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Modalidad *
          </p>
          <div className="flex overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => update('modality', 'retiro')}
              className="flex-1 py-2.5 text-center text-sm font-semibold transition-colors"
              style={{
                background: customer.modality === 'retiro' ? 'var(--brand)' : 'var(--surface)',
                color: customer.modality === 'retiro' ? 'var(--background)' : 'var(--text-muted)',
              }}
            >
              Retiro en el local
            </button>
            <button
              type="button"
              onClick={() => update('modality', 'delivery')}
              className="flex-1 py-2.5 text-center text-sm font-semibold transition-colors"
              style={{
                background: customer.modality === 'delivery' ? 'var(--brand)' : 'var(--surface)',
                color: customer.modality === 'delivery' ? 'var(--background)' : 'var(--text-muted)',
              }}
            >
              Delivery
            </button>
          </div>
        </div>

        {customer.modality === 'delivery' && (
          <div>
            <label
              htmlFor="order-address"
              className="mb-1.5 block text-xs font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Dirección *
            </label>
            <input
              id="order-address"
              type="text"
              required
              value={customer.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Calle, número, ciudad"
              className="w-full rounded-xl px-4 py-3 text-base outline-none transition-colors"
              style={{
                background: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Método de pago *
          </p>
          <div className="flex overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => update('payment', 'efectivo')}
              className="flex-1 py-2.5 text-center text-sm font-semibold transition-colors"
              style={{
                background: customer.payment === 'efectivo' ? 'var(--brand)' : 'var(--surface)',
                color: customer.payment === 'efectivo' ? 'var(--background)' : 'var(--text-muted)',
              }}
            >
              Efectivo
            </button>
            <button
              type="button"
              onClick={() => update('payment', 'transferencia')}
              className="flex-1 py-2.5 text-center text-sm font-semibold transition-colors"
              style={{
                background: customer.payment === 'transferencia' ? 'var(--brand)' : 'var(--surface)',
                color: customer.payment === 'transferencia' ? 'var(--background)' : 'var(--text-muted)',
              }}
            >
              Transferencia
            </button>
          </div>
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
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="flex-1 rounded-xl py-3 text-sm font-bold tracking-wide transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
