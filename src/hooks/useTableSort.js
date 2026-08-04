import { useState, useMemo } from 'react'
import { sortBy } from '../services/dataService'

export function useTableSort(data, defaultField, defaultDirection = 'desc') {
  const [sortField, setSortField]         = useState(defaultField)
  const [sortDirection, setSortDirection] = useState(defaultDirection)

  const sortedData = useMemo(
    () => sortBy(data, sortField, sortDirection),
    [data, sortField, sortDirection]
  )

  function handleSortChange(field) {
    if (field === sortField) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return { sortedData, sortField, sortDirection, handleSortChange }
}
