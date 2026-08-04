export default function StatusBadge({ overdueDays }) {
  if (overdueDays === 0)    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Trong hạn</span>
  if (overdueDays <= 30)   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">1-30 ngày</span>
  if (overdueDays <= 90)   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">31-90 ngày</span>
  if (overdueDays <= 180)  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">91-180 ngày</span>
  return                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">&gt;180 ngày</span>
}
