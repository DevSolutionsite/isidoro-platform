'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useRef } from 'react'

type Category = { id: string; name: string; parent_category_id: string | null }

export function ProductFilters({
  categories,
  defaultQuery,
  defaultCategoria,
}: {
  categories: Category[]
  defaultQuery: string
  defaultCategoria: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (timerRef.current) clearTimeout(timerRef.current)
    const value = e.target.value.trim()
    timerRef.current = setTimeout(() => updateParam('q', value), 300)
  }

  function handleCategoriaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateParam('categoria', e.target.value)
  }

  const topLevelCategories = categories.filter((c) => !c.parent_category_id)

  function subcategoriesOf(categoryId: string) {
    return categories.filter((c) => c.parent_category_id === categoryId)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          width={15}
          height={15}
          viewBox="0 0 15 15"
          fill="none"
          style={{ color: 'var(--text-muted)' }}
        >
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          defaultValue={defaultQuery}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre…"
          className="rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            width: 280,
          }}
        />
      </div>

      <select
        defaultValue={defaultCategoria}
        onChange={handleCategoriaChange}
        className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
        style={{
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        <option value="">Todas</option>
        {topLevelCategories.map((cat) => {
          const subcats = subcategoriesOf(cat.id)
          if (subcats.length === 0) {
            return (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            )
          }
          return (
            <optgroup key={cat.id} label={cat.name}>
              <option value={cat.id}>{cat.name}</option>
              {subcats.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </div>
  )
}
