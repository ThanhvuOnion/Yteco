import SearchIcon  from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import ClearIcon from '@mui/icons-material/Clear'

export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', width = 'w-64' }) {
  return (
    <div className="relative">
      <SearchIcon fontSize="small" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${width} border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
      />
    </div>
  )
}

export function SelectFilter({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value ?? opt} value={opt.value ?? opt} disabled={opt.disabled}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  )
}

export function FilterBar({ children, onReset, hasActiveFilters }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
      <FilterListIcon fontSize="small" className="text-gray-400" />
      {children}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 ml-auto"
        >
          <ClearIcon fontSize="inherit" />
          Xóa bộ lọc
        </button>
      )}
    </div>
  )
}
