/**
 * Tiêu đề trang gồm heading lớn + mô tả nhỏ bên dưới.
 * Dùng chung ở đầu mỗi page để tránh lặp markup.
 */
export default function PageHeader({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}
