'use client'

import { useState } from 'react'
import { slugify } from '@/lib/utils'
import type { Category } from '@/lib/types'

interface CategoryMenuProps {
  categories: Pick<Category, 'id' | 'name'>[]
}

export function CategoryMenu({ categories }: CategoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  function handleSelect(category: Pick<Category, 'id' | 'name'>) {
    setIsOpen(false)
    setTimeout(() => {
      const el = document.getElementById(`section-${slugify(category.name)}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
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
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className="w-full text-left px-5 py-3.5 text-sm font-medium transition-colors"
                  style={{ color: 'var(--foreground)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-alt)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  )
}
