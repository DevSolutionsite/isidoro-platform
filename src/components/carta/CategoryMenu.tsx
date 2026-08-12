'use client'

import { useState } from 'react'
import { slugify } from '@/lib/utils'
import { RESTAURANT_WHATSAPP_NUMBER } from '@/lib/constants'
import { OrderModal } from './order/OrderModal'
import type { Category, ProductWithDiscount } from '@/lib/types'

interface CategoryMenuProps {
  categories: Pick<Category, 'id' | 'name' | 'parent_category_id'>[]
  products: ProductWithDiscount[]
}

const WHATSAPP_URL = `https://wa.me/${RESTAURANT_WHATSAPP_NUMBER}?text=Hola%2C%20quiero%20hacer%20una%20reserva%20en%20Isidoro`
const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=San+Mart%C3%ADn+y+Pueyrred%C3%B3n%2C+S3080+Esperanza%2C+Santa+Fe'

export function CategoryMenu({ categories, products }: CategoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const topLevelCategories = categories.filter((c) => !c.parent_category_id)

  function subcategoriesOf(categoryId: string) {
    return categories.filter((c) => c.parent_category_id === categoryId)
  }

  function handleSelect(category: Pick<Category, 'id' | 'name'>) {
    setIsOpen(false)
    setTimeout(() => {
      const el = document.getElementById(`section-${slugify(category.name)}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  function toggleExpanded(categoryId: string) {
    setExpandedId((current) => (current === categoryId ? null : categoryId))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-md transition-opacity hover:opacity-60"
        style={{ color: 'var(--foreground)' }}
        aria-label="Abrir menú de categorías"
        aria-expanded={isOpen}
      >
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            className="fixed left-0 top-0 h-full z-30 flex flex-col shadow-2xl"
            style={{ width: 280, background: 'var(--surface)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Categorías del menú"
          >
            <div
              className="flex items-center justify-between px-4 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                Categorías
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md transition-opacity hover:opacity-60"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Cerrar menú"
              >
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
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {topLevelCategories.map((cat) => {
                const subcats = subcategoriesOf(cat.id)
                const hasSubcats = subcats.length > 0
                const isExpanded = expandedId === cat.id
                return (
                  <div key={cat.id}>
                    <div
                      className="flex items-center"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--surface-alt)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(cat)}
                        className="flex-1 text-left px-5 py-3.5 text-sm font-medium"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {cat.name}
                      </button>
                      {hasSubcats && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(cat.id)}
                          className="px-4 py-3.5"
                          style={{ color: 'var(--foreground)' }}
                          aria-label={isExpanded ? 'Contraer subcategorías' : 'Expandir subcategorías'}
                          aria-expanded={isExpanded}
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
                      )}
                    </div>

                    {hasSubcats && isExpanded && (
                      <div>
                        {subcats.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelect(sub)}
                            className="w-full text-left pl-9 pr-5 py-3 text-sm transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--surface-alt)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              <hr className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors"
                style={{ color: 'var(--brand)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--brand-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.484 1.34 5.002L2 22l5.116-1.334a9.96 9.96 0 0 0 4.888 1.28h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.671-1.04-5.182-2.929-7.071a9.935 9.935 0 0 0-7.072-2.875zm5.85 15.847a8.28 8.28 0 0 1-5.85 2.423h-.003a8.284 8.284 0 0 1-4.223-1.155l-.303-.18-3.037.792.811-2.96-.198-.304a8.264 8.264 0 0 1-1.267-4.42c0-4.582 3.73-8.312 8.315-8.312a8.26 8.26 0 0 1 5.877 2.435 8.259 8.259 0 0 1 2.435 5.877 8.285 8.285 0 0 1-2.557 5.804z" />
                </svg>
                Hacé tu reserva aquí
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setIsOrderOpen(true)
                }}
                className="w-full flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors"
                style={{ color: 'var(--brand)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--brand-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Hacer un pedido
              </button>

              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors"
                style={{ color: 'var(--brand)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--brand-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Cómo llegar
              </a>
            </nav>
          </div>
        </>
      )}

      {isOrderOpen && (
        <OrderModal
          categories={categories}
          products={products}
          onClose={() => setIsOrderOpen(false)}
        />
      )}
    </>
  )
}
