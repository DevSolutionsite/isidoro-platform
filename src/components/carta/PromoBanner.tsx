interface PromoBannerProps {
  title: string
  description: string | null
  type: 'promo' | 'time'
}

export function PromoBanner({ title, description, type }: PromoBannerProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 shrink-0 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold" style={{ color: 'var(--background)' }}>
        {type === 'time' ? 'AHORA' : 'PROMO'}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        )}
      </div>
    </div>
  )
}
