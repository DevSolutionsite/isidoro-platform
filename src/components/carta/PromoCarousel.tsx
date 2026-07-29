import { formatARS } from '@/lib/utils'
import type { PromoSlide } from '@/lib/types'

interface PromoCarouselProps {
  slides: PromoSlide[]
}

function SlideImagePlaceholder() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: '#192c22' }}
    >
      <svg
        width="48"
        height="48"
        fill="none"
        stroke="#ca9e69"
        strokeWidth={1}
        viewBox="0 0 24 24"
        aria-hidden="true"
        opacity={0.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

export function PromoCarousel({ slides }: PromoCarouselProps) {
  if (slides.length === 0) return null

  return (
    <div
      className="flex overflow-x-auto"
      style={{
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
        msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
      }}
    >
      {slides.map((slide) => (
        <article
          key={slide.id}
          className="relative shrink-0 overflow-hidden"
          style={{
            scrollSnapAlign: 'start',
            width: '100vw',
            height: 260,
          }}
        >
          <SlideImagePlaceholder />

          {/* gradient for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)',
            }}
          />

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2"
              style={{ background: '#ca9e69', color: '#1f352a' }}
            >
              {slide.badge}
            </span>

            <p
              className="text-2xl font-semibold leading-tight font-display"
              style={{ color: '#ca9e69' }}
            >
              {slide.title}
            </p>

            {slide.description && (
              <p
                className="mt-0.5 text-sm leading-snug"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                {slide.description}
              </p>
            )}

            {slide.price != null && (
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-lg font-bold text-white">
                  {formatARS(slide.price)}
                </span>
                {slide.originalPrice != null && (
                  <span
                    className="text-sm line-through"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {formatARS(slide.originalPrice)}
                  </span>
                )}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
