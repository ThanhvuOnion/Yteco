// ─── Shared Recharts helpers ───────────────────────────────────────────────

export const CHART_MARGIN        = { top: 5, right: 10, left: 10, bottom: 5 }
export const CHART_MARGIN_LARGE  = { top: 5, right: 20, left: 10, bottom: 5 }
export const GRID_STROKE         = '#f0f0f0'
export const GRID_DASH           = '3 3'

/**
 * Rút gọn số tiền lớn thành dạng "100B" hoặc "500M" cho trục biểu đồ.
 * Ví dụ: 1_500_000_000 → "1B", 500_000 → "500M"
 */
export function formatAxisValue(value) {
  if (value >= 1e9) return (value / 1e9).toFixed(0) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M'
  return value
}
