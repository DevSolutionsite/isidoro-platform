import { formatARS } from '@/lib/utils'
import type { ProductWithDiscount } from '@/lib/types'

function ImagePlaceholder() {
  return (
    <svg
      className="h-8 w-8 text-border"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

interface ProductCardProps {
  product: ProductWithDiscount
  pointsPerPeso: number
}

export function ProductCard({ product, pointsPerPeso }: ProductCardProps) {
  const unavailable = !product.is_available
  const hasDiscount = product.discount_price != null
  const displayPrice = hasDiscount ? product.discount_price! : product.price
  const pointsEarned = Math.floor(displayPrice * pointsPerPeso)

  return (
    <article
      className={`flex gap-3 overflow-hidden rounded-xl border border-border bg-surface${unavailable ? ' opacity-60' : ''}`}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 108,
          height: 108,
          background: 'var(--surface-alt)',
          borderRadius: 8,
        }}
      >
        <ImagePlaceholder />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight" style={{ color: '#f5efe6' }}>
            {product.name}
          </h3>
          {unavailable && (
            <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-xs text-text-muted">
              Sin stock
            </span>
          )}
          {!unavailable && hasDiscount && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ background: 'var(--brand)', color: 'var(--background)' }}
            >
              PROMO
            </span>
          )}
        </div>

        {product.description && (
          <p
            className="mt-1 line-clamp-2 text-xs leading-relaxed"
            style={{ color: 'rgba(245,239,230,0.50)' }}
          >
            {product.description}
          </p>
        )}

        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-base font-bold" style={{ color: '#ca9e69' }}>
            {formatARS(displayPrice)}
          </p>
          {hasDiscount && (
            <p className="text-xs text-text-muted line-through">
              {formatARS(product.price)}
            </p>
          )}
        </div>

        <p className="mt-0.5 text-xs text-text-muted">
          + {pointsEarned} pts
        </p>
      </div>
    </article>
  )
}
