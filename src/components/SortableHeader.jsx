import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import UnfoldMoreIcon    from '@mui/icons-material/UnfoldMore'

export default function SortableHeader({ label, field, sortField, sortDirection, onSort, align = 'left' }) {
  const isActive = sortField === field

  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-gray-500 font-medium cursor-pointer select-none hover:bg-gray-100 transition-colors
        ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'right' && (
          <span className="text-gray-400" style={{ fontSize: 14 }}>
            {isActive
              ? (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)
              : <UnfoldMoreIcon fontSize="inherit" />}
          </span>
        )}
        {label}
        {align !== 'right' && (
          <span className="text-gray-400" style={{ fontSize: 14 }}>
            {isActive
              ? (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)
              : <UnfoldMoreIcon fontSize="inherit" />}
          </span>
        )}
      </span>
    </th>
  )
}
