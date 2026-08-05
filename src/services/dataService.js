import rawData from '../data/congno.json'

// ─── Constants ───────────────────────────────────────────────────────────────

export const FALLBACK_TOOLTIPS = {
  nhomLoaiHinh: '1.393 giao dịch chưa được gán nhóm loại hình kinh doanh trong hệ thống.',
  jobName:      '508 giao dịch chưa có mã loại hình kinh doanh (JobCode trống). Dữ liệu từ hệ thống kế toán chưa được ánh xạ đầy đủ sang danh mục loại hình.',
}

export const BRANCH_MAP = {
  A01: 'Văn phòng',
  A02: 'Hà Nội',
  A03: 'Đà Nẵng',
  A04: 'Cần Thơ',
}

export const OVERDUE_BUCKET_ORDER = [
  'Trong hạn',
  '1 - 30 ngày',
  '31 - 90 ngày',
  '91 - 180 ngày',
  '181 - 365 ngày',
  '> 365 ngày',
]

export const BUCKET_COLORS = {
  'Trong hạn':      '#10b981',
  '1 - 30 ngày':    '#f59e0b',
  '31 - 90 ngày':   '#fb923c',
  '91 - 180 ngày':  '#ef4444',
  '181 - 365 ngày': '#dc2626',
  '> 365 ngày':     '#7f1d1d',
}

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

// ─── Normalize helpers ────────────────────────────────────────────────────────

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function stripCustomerPrefix(name) {
  return (name || '').replace(/^[A-Z]{2}\d{5}_/, '').trim()
}

function getOverdueBucket(overdueDays) {
  if (overdueDays === 0)  return 'Trong hạn'
  if (overdueDays <= 30)  return '1 - 30 ngày'
  if (overdueDays <= 90)  return '31 - 90 ngày'
  if (overdueDays <= 180) return '91 - 180 ngày'
  if (overdueDays <= 365) return '181 - 365 ngày'
  return '> 365 ngày'
}

function normalizeRecord(record) {
  let overdueDays = 0
  if (record.DocDate) {
    const payDeadline = new Date(record.DocDate).getTime() + (record.DueDate || 0) * 86400000
    overdueDays = Math.max(0, Math.floor((TODAY.getTime() - payDeadline) / 86400000))
  }
  const cleanName = stripCustomerPrefix(record.CustomerName) || record.PersonName1 || record.CustomerCode

  return {
    ...record,
    nhomLoaiHinh:   record.nhomLoaiHinh   || 'Khác',
    phanLoaiCongNo: record.phanLoaiCongNo || 'Chưa xác định',
    JobName:        record.JobName        || 'Khác',
    displayName:    cleanName,
    branchName:     BRANCH_MAP[record.BranchCode] || record.BranchCode,
    overdueDays,
    isOutlier:      overdueDays > 1825,
    overdueBucket:  getOverdueBucket(overdueDays),
    docMonth:       record.DocDate ? record.DocDate.slice(0, 7) : null,
    docYear:        record.DocDate ? record.DocDate.slice(0, 4) : (record.Year || null),
  }
}

const allRecords = rawData.map(normalizeRecord)

// ─── Sort helper ──────────────────────────────────────────────────────────────

export function sortBy(arr, field, direction = 'desc') {
  return [...arr].sort((a, b) => {
    const aVal = a[field] ?? 0
    const bVal = b[field] ?? 0
    if (typeof aVal === 'string') {
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return direction === 'asc' ? aVal - bVal : bVal - aVal
  })
}

// ─── Aggregated views ─────────────────────────────────────────────────────────

export function getDebtByBranch() {
  const byBranch = {}

  for (const r of allRecords) {
    const key = r.branchName
    if (!byBranch[key]) {
      byBranch[key] = { branch: key, totalAmount: 0, overdueAmount: 0, count: 0 }
    }
    byBranch[key].totalAmount += r.CloseBal || 0
    byBranch[key].count       += 1
    if (r.overdueDays > 0) {
      byBranch[key].overdueAmount += r.CloseBal || 0
    }
  }

  return sortBy(Object.values(byBranch), 'totalAmount')
}

export function getDebtByNhomLoaiHinh() {
  const byNhom = {}

  for (const r of allRecords) {
    const key = r.nhomLoaiHinh
    if (!byNhom[key]) {
      byNhom[key] = { name: key, value: 0, count: 0 }
    }
    byNhom[key].value += r.CloseBal || 0
    byNhom[key].count += 1
  }

  return sortBy(Object.values(byNhom), 'value')
}

export function getDebtByYearAndBranch() {
  const branchList = Object.values(BRANCH_MAP)
  const byYear = {}

  for (const r of allRecords) {
    const key = r.docYear
    if (!key) continue
    if (!byYear[key]) {
      byYear[key] = { year: key }
    }
    byYear[key][r.branchName] = (byYear[key][r.branchName] || 0) + (r.CloseBal || 0)
  }

  return { data: sortBy(Object.values(byYear), 'year', 'asc'), branches: branchList }
}

export function getAgingBuckets() {
  const byBucket = {}
  for (const k of OVERDUE_BUCKET_ORDER) {
    byBucket[k] = { bucket: k, amount: 0, count: 0 }
  }

  for (const r of allRecords) {
    byBucket[r.overdueBucket].amount += r.CloseBal || 0
    byBucket[r.overdueBucket].count  += 1
  }

  return OVERDUE_BUCKET_ORDER.map(k => byBucket[k])
}

export function getTopCustomers(limit = 10, sortField = 'totalAmount') {
  const byCustomer = {}

  for (const r of allRecords) {
    const key = r.CustomerCode
    if (!byCustomer[key]) {
      byCustomer[key] = {
        code:           key,
        name:           r.displayName,
        branchName:     r.branchName,
        nhomLoaiHinh:   r.nhomLoaiHinh,
        totalAmount:    0,
        overdueAmount:  0,
        count:          0,
        maxOverdueDays: 0,
      }
    }
    byCustomer[key].totalAmount += r.CloseBal || 0
    byCustomer[key].count       += 1
    if (r.overdueDays > 0) {
      byCustomer[key].overdueAmount += r.CloseBal || 0
    }
    if (r.overdueDays > byCustomer[key].maxOverdueDays) {
      byCustomer[key].maxOverdueDays = r.overdueDays
    }
  }

  return sortBy(Object.values(byCustomer), sortField).slice(0, limit)
}

export function getDebtByJobName() {
  const byJob = {}

  for (const r of allRecords) {
    const key = r.JobName
    if (!byJob[key]) {
      byJob[key] = { name: key, nhomLoaiHinh: r.nhomLoaiHinh, amount: 0, count: 0 }
    }
    byJob[key].amount += r.CloseBal || 0
    byJob[key].count  += 1
  }

  return sortBy(Object.values(byJob), 'amount')
}

// ─── Customer list (one row per customer) ─────────────────────────────────────

export function getCustomerList() {
  const byCustomer = {}

  for (const r of allRecords) {
    const key = r.CustomerCode
    if (!byCustomer[key]) {
      byCustomer[key] = {
        code:           key,
        name:           r.displayName,
        branchName:     r.branchName,
        nhomLoaiHinh:   r.nhomLoaiHinh,
        phanLoaiCongNo: r.phanLoaiCongNo,
        dueDateDays:    r.DueDate,
        totalAmount:    0,
        overdueAmount:  0,
        maxOverdueDays: 0,
        invoiceCount:   0,
      }
    }
    byCustomer[key].totalAmount  += r.CloseBal || 0
    byCustomer[key].invoiceCount += 1
    if (r.overdueDays > 0) {
      byCustomer[key].overdueAmount += r.CloseBal || 0
    }
    if (r.overdueDays > byCustomer[key].maxOverdueDays) {
      byCustomer[key].maxOverdueDays = r.overdueDays
    }
  }

  return sortBy(Object.values(byCustomer), 'totalAmount')
}

// ─── Phân loại công nợ ────────────────────────────────────────────────────────

export function getAllRecords() {
  return allRecords
}

export function getPhanLoaiSummary() {
  const ORDER = ['Chưa xác định', 'Loại 1', 'Loại 2']
  const byPhanLoai = {}

  for (const r of allRecords) {
    const key = r.phanLoaiCongNo
    if (!byPhanLoai[key]) {
      byPhanLoai[key] = { name: key, count: 0, amount: 0 }
    }
    byPhanLoai[key].count  += 1
    byPhanLoai[key].amount += r.CloseBal || 0
  }

  const result = []
  for (const name of ORDER) {
    if (byPhanLoai[name]) result.push(byPhanLoai[name])
  }
  return result
}

export function getCustomerSummaryByRecords(records, limit = 10) {
  const byCustomer = {}

  for (const record of records) {
    const key = record.CustomerCode
    if (!byCustomer[key]) {
      byCustomer[key] = { name: record.displayName, amount: 0, count: 0 }
    }
    byCustomer[key].amount += record.CloseBal || 0
    byCustomer[key].count  += 1
  }

  return sortBy(Object.values(byCustomer), 'amount').slice(0, limit)
}

// ─── Filter helpers (used by pages) ───────────────────────────────────────────

export function getUniqueYears() {
  const years = []
  for (const r of allRecords) {
    if (r.docYear && !years.includes(r.docYear)) {
      years.push(r.docYear)
    }
  }
  years.sort()
  return years
}

export function getUniqueBranches() {
  const branches = []
  for (const r of allRecords) {
    if (!branches.includes(r.branchName)) {
      branches.push(r.branchName)
    }
  }
  branches.sort()
  return branches
}

export function getUniqueNhomLoaiHinh() {
  const nhoms = []
  for (const r of allRecords) {
    if (!nhoms.includes(r.nhomLoaiHinh)) {
      nhoms.push(r.nhomLoaiHinh)
    }
  }
  nhoms.sort()
  return nhoms
}

// ─── Format utilities ─────────────────────────────────────────────────────────

export function formatCurrency(value) {
  if (value == null)          return '-'
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(1) + ' tỷ'
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(0) + ' triệu'
  return value.toLocaleString('vi-VN') + ' đ'
}

export function formatDate(isoString) {
  if (!isoString) return '-'
  return isoString.slice(0, 10)
}
