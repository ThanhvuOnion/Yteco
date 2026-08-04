import { formatCurrency } from '../services/dataService'

/**
 * Tooltip dùng chung cho tất cả biểu đồ Recharts.
 * Hiển thị label + từng giá trị được format thành tiền VND.
 */
export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}
