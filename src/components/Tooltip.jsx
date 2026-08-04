import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

export default function Tooltip({ children, content, position = 'top' }) {
  const positionClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  }

  return (
    <span className="relative group inline-flex items-center gap-1">
      {children}
      <InfoOutlinedIcon sx={{ fontSize: 13 }} className="text-gray-400 group-hover:text-blue-500 cursor-help transition-colors flex-shrink-0" />
      <span
        className={`
          absolute z-50 ${positionClasses[position]}
          w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg
          opacity-0 group-hover:opacity-100
          pointer-events-none group-hover:pointer-events-auto
          transition-opacity duration-200
          leading-relaxed
        `}
      >
        {content}
        {/* Arrow */}
        <span className={`
          absolute w-2 h-2 bg-gray-900 rotate-45
          ${position === 'top'    ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
          ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
          ${position === 'right'  ? 'right-full top-1/2 translate-x-1/2 -translate-y-1/2' : ''}
          ${position === 'left'   ? 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
        `} />
      </span>
    </span>
  )
}
