import { useCallback, useEffect, useState } from 'react'

export type ColumnSortDirection = 'asc' | 'desc'

const storageKey = (userId?: string) => `flowdesk_column_sort_${userId || 'anon'}`

/**
 * Per-user, per-column sort preference for board cards.
 *
 * Preferences are persisted to localStorage keyed by the authenticated user,
 * so each user keeps their own ordering choice for every column across
 * sessions.
 */
export function useColumnSort(userId?: string) {
  const [sorts, setSorts] = useState<Record<string, ColumnSortDirection>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId))
      if (raw) setSorts(JSON.parse(raw))
    } catch {
      /* ignore malformed storage */
    }
  }, [userId])

  const persist = useCallback(
    (next: Record<string, ColumnSortDirection>) => {
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next))
      } catch {
        /* storage might be unavailable (private mode) — keep in-memory only */
      }
    },
    [userId],
  )

  const getSort = useCallback(
    (columnId: string): ColumnSortDirection => sorts[columnId] ?? 'asc',
    [sorts],
  )

  const setSort = useCallback(
    (columnId: string, direction: ColumnSortDirection) => {
      setSorts((prev) => {
        const next = { ...prev, [columnId]: direction }
        persist(next)
        return next
      })
    },
    [persist],
  )

  return { sorts, getSort, setSort }
}

/**
 * Comparable timestamp for a card. Uses `due_date` when present, falling back
 * to `created`. This guarantees every card — including completed ones without
 * a due date — gets a deterministic sortable value, which is what fixes the
 * "cards concluded appear in random order" bug.
 */
export const getColumnCardDate = (card: any): number => {
  if (card?.due_date) {
    const t = new Date(card.due_date).getTime()
    if (!isNaN(t)) return t
  }
  if (card?.created) {
    const t = new Date(card.created).getTime()
    if (!isNaN(t)) return t
  }
  return 0
}

/**
 * Sort a column's cards by date according to the chosen direction.
 *
 * - `asc`  → "Mais antigos primeiro" (oldest first)
 * - `desc` → "Mais novos primeiro"   (newest first)
 *
 * Ties on the comparable date are broken by `sort_order` then `created`, so
 * the ordering is always stable.
 *
 * Returns a new array — never mutates the input (the previous implementation
 * called `.sort()` directly on the React prop, which mutated state during
 * render).
 */
export const sortColumnCards = (cards: any[], direction: ColumnSortDirection): any[] => {
  return [...cards].sort((a, b) => {
    const da = getColumnCardDate(a)
    const db = getColumnCardDate(b)
    if (da !== db) return direction === 'asc' ? da - db : db - da

    const soA = typeof a.sort_order === 'number' ? a.sort_order : 0
    const soB = typeof b.sort_order === 'number' ? b.sort_order : 0
    if (soA !== soB) return soA - soB

    return new Date(a.created || 0).getTime() - new Date(b.created || 0).getTime()
  })
}
