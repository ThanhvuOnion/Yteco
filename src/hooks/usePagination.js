import { useState, useMemo } from 'react'

export function usePagination(data, itemsPerPage = 15) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage))
  const safePage   = Math.min(currentPage, totalPages)

  const pagedData = useMemo(
    () => data.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage),
    [data, safePage, itemsPerPage]
  )

  function resetPage() { setCurrentPage(1) }

  return { pagedData, currentPage: safePage, totalPages, setCurrentPage, resetPage }
}
