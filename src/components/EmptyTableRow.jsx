/**
 * Hàng trống hiển thị khi bảng không có kết quả.
 * colSpan phải khớp với số cột của bảng đang dùng.
 */
export default function EmptyTableRow({ colSpan, message = 'Không có kết quả' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-10 text-gray-400">
        {message}
      </td>
    </tr>
  )
}
