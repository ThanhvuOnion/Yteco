import Tooltip from './Tooltip'
import { FALLBACK_TOOLTIPS } from '../services/dataService'

const NHOM_STYLES = {
  'Hợp tác':       'bg-blue-50 text-blue-700',
  'Tự doanh':      'bg-green-50 text-green-700',
  'Tính phí':      'bg-purple-50 text-purple-700',
  'Khác':          'bg-gray-100 text-gray-500',
}

export function NhomLoaiHinhBadge({ value }) {
  const style = NHOM_STYLES[value] || 'bg-gray-100 text-gray-500'
  const badge = (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {value}
    </span>
  )

  if (value !== 'Khác') return badge

  return (
    <Tooltip content={FALLBACK_TOOLTIPS.nhomLoaiHinh} position="top">
      {badge}
    </Tooltip>
  )
}

export function JobNameLabel({ value }) {
  if (value !== 'Khác') return <span className="font-medium text-gray-800">{value}</span>

  return (
    <Tooltip content={FALLBACK_TOOLTIPS.jobName} position="top">
      <span className="font-medium text-gray-500 italic">{value}</span>
    </Tooltip>
  )
}
