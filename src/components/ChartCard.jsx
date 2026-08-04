/**
 * Card trắng bọc quanh biểu đồ — tái sử dụng thay cho div lặp lại.
 * Props:
 *   title      — tiêu đề hiển thị phía trên biểu đồ (tuỳ chọn)
 *   action     — nút hoặc filter đặt phía phải tiêu đề (tuỳ chọn)
 *   noPadding  — bỏ padding bên trong khi cần table sát mép card
 */
export default function ChartCard({ title, action, noPadding = false, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {(title || action) && (
        <div className={`flex items-center justify-between flex-wrap gap-3 ${noPadding ? 'p-5' : 'px-5 pt-5'} border-b border-gray-100 pb-4`}>
          {title && <h3 className="font-semibold text-gray-700">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  )
}
