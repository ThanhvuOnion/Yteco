import { useState, useMemo, useEffect } from 'react'
import defaultData  from '../data/congno-2026-04.json'
import monthlyData  from '../data/congno-monthly.json'
import PageHeader   from '../components/PageHeader'
import KPICard      from '../components/KPICard'
import ChartCard    from '../components/ChartCard'
import { FilterBar, SearchInput, SelectFilter } from '../components/FilterBar'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_MARGIN, GRID_STROKE, GRID_DASH } from '../utils/chartUtils'
import AssessmentIcon   from '@mui/icons-material/Assessment'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import TrendingUpIcon   from '@mui/icons-material/TrendingUp'
import ErrorIcon        from '@mui/icons-material/Error'
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

// ─── Hằng số ─────────────────────────────────────────────────────────────────

const BRANCH_COLS = [
  { key: 'VP', label: 'Văn phòng' },
  { key: 'CT', label: 'Cần Thơ'  },
  { key: 'HN', label: 'Hà Nội'   },
  { key: 'DN', label: 'Đà Nẵng'  },
]

const BRANCH_OPTIONS = [
  { value: '', label: 'Tất cả CN' },
  { value: 'VP', label: 'Văn phòng' },
  { value: 'CT', label: 'Cần Thơ' },
  { value: 'HN', label: 'Hà Nội' },
  { value: 'DN', label: 'Đà Nẵng' },
]

// ─── Cấu hình tháng ──────────────────────────────────────────────────────────

// Vite phân tích glob tĩnh lúc build — tự động nhận khi user thêm file mới
const MONTH_FILES = import.meta.glob('../data/congno-????-??.json')

// Lấy danh sách file key có sẵn: '../data/congno-2026-04.json' → '2026-04'
const AVAILABLE_KEYS = new Set(
  Object.keys(MONTH_FILES).map(p => p.match(/congno-(\d{4}-\d{2})\.json/)?.[1]).filter(Boolean)
)

// Kết hợp monthlyData với fileKey & trạng thái có sẵn
const MONTHS_CONFIG = monthlyData.map(m => {
  const match = m.month.match(/T(\d+)\/(\d+)/)
  const fileKey = match ? `${match[2]}-${match[1].padStart(2, '0')}` : null
  return { ...m, fileKey, available: fileKey ? AVAILABLE_KEYS.has(fileKey) : false }
})

const MONTH_OPTIONS = MONTHS_CONFIG.map(m => ({
  value:    m.fileKey ?? '',
  label:    m.available ? m.month : `${m.month} (chưa có data)`,
  disabled: !m.available,
}))

// ─── Branch mapping (đúng theo notes Excel) ──────────────────────────────────
// VP  = A01 + bộ phận Kinh Doanh (mặc định A01)
// CT  = A04 + A01/Chi Nhánh Cần Thơ
// HN  = A02 + A01/Chi Nhánh Hà Nội
// DN  = A03 + A01/Chi Nhánh Đà Nẵng

function getBranchKey(r) {
  const bc   = r.BranchCode
  const dept = (r.DeptName || '').toLowerCase()
  if (bc === 'A04') return 'CT'
  if (bc === 'A02') return 'HN'
  if (bc === 'A03') return 'DN'
  if (bc === 'A01') {
    if (dept.includes('cần thơ')) return 'CT'
    if (dept.includes('hà nội'))  return 'HN'
    if (dept.includes('đà nẵng')) return 'DN'
    return 'VP'
  }
  return null
}

// ─── Helpers tính toán ────────────────────────────────────────────────────────

function agg(records, field = 'CloseBal') {
  const r = { total: 0, VP: 0, CT: 0, HN: 0, DN: 0 }
  for (const rec of records) {
    const key = getBranchKey(rec)
    const val = Number(rec[field]) || 0
    r.total += val
    if (key) r[key] += val
  }
  return r
}

const ZERO = { total: 0, VP: 0, CT: 0, HN: 0, DN: 0 }

function addAgg(a, b) {
  return { total: a.total+b.total, VP: a.VP+b.VP, CT: a.CT+b.CT, HN: a.HN+b.HN, DN: a.DN+b.DN }
}

function subAgg(a, b) {
  return { total: a.total-b.total, VP: a.VP-b.VP, CT: a.CT-b.CT, HN: a.HN-b.HN, DN: a.DN-b.DN }
}

function rateAgg(num, den) {
  const pct = k => den[k] > 0 ? (num[k] / den[k] * 100) : null
  return { total: pct('total'), VP: pct('VP'), CT: pct('CT'), HN: pct('HN'), DN: pct('DN') }
}

function fmtCurrency(v) {
  if (v == null) return '-'
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(0)} tr`
  return v.toLocaleString('vi-VN')
}

function fmtVal(v, isRate) {
  if (v === null || v === undefined) return '-'
  if (isRate) return `${Number(v).toFixed(2)}%`
  return fmtCurrency(v)
}

function docYear(r) {
  return r.DocDate ? parseInt(r.DocDate.slice(0, 4), 10) : (r.Year ?? 9999)
}

// ─── Xây dựng hàng báo cáo ───────────────────────────────────────────────────

function buildReportRows(records) {

  // ── Phân nhóm theo DeptName (groups 1–5) ─────────────────────────────────
  const isKD   = r => { const d = r.DeptName || ''; return d === 'Phòng Kinh Doanh' || d.startsWith('Chi Nhánh') || d === 'Trình Dược Viên' }
  const isTTB  = r => (r.DeptName || '').includes('Trang Thiết')
  const isXNK  = r => !r.DeptName && !r.nhomLoaiHinh   // không phân bộ phận, không phân nhóm

  const g1_xnk = records.filter(isXNK)
  const g2_ttb = records.filter(isTTB)
  const g5_kd  = records.filter(isKD)
  // g3 Tòa nhà, g4 Khác = 0 trong data hiện tại

  // ── Sub-groups trong Group 5 (Kinh Doanh) ────────────────────────────────
  // Note E15/E16: Loại 2 = khách hàng khai báo Loại 2; Loại 1 loại trừ Loại 2
  const loai2 = g5_kd.filter(r => r.phanLoaiCongNo === 'Loại 2')
  const tp    = g5_kd.filter(r => r.nhomLoaiHinh === 'Tính phí')
  const ht    = g5_kd.filter(r => r.nhomLoaiHinh === 'Hợp tác')
  const td    = g5_kd.filter(r => r.nhomLoaiHinh === 'Tự doanh')
  const kd    = [...ht, ...td]   // KD phụ trách = Hợp tác + Tự doanh (note D21)

  // ── Tổng hợp Part A ──────────────────────────────────────────────────────
  const tot_all = agg(records)
  const tot_g1  = agg(g1_xnk)
  const tot_g2  = agg(g2_ttb)
  const tot_g5  = agg(g5_kd)
  const tot_l2  = agg(loai2)
  const tot_tp  = agg(tp)
  const tot_kd  = agg(kd)
  const tot_ht  = agg(ht)
  const tot_td  = agg(td)

  // 5.4 – Trong hạn
  const th_ht  = agg(ht, 'CloseBal_00')
  const th_td  = agg(td, 'CloseBal_00')
  const th_kd  = addAgg(th_ht, th_td)

  // 5.4 – Quá hạn chung
  const qh_ht  = subAgg(tot_ht, th_ht)
  const qh_td  = subAgg(tot_td, th_td)
  const qh_kd  = subAgg(tot_kd, th_kd)

  // Aging buckets KD
  const qh1_ht = agg(ht, 'CloseBal_01')
  const qh1_td = agg(td, 'CloseBal_01')
  const qh1_kd = addAgg(qh1_ht, qh1_td)

  const gt1_ht = agg(ht, 'CloseBal_01T')
  const gt1_td = agg(td, 'CloseBal_01T')
  const gt1_kd = addAgg(gt1_ht, gt1_td)

  const gt3_ht = agg(ht, 'CloseBal_03T')
  const gt3_td = agg(td, 'CloseBal_03T')
  const gt3_kd = addAgg(gt3_ht, gt3_td)

  // Tỷ lệ KD
  const rt_qh  = rateAgg(qh_kd,  tot_kd)
  const rt_qh1 = rateAgg(qh1_kd, tot_kd)
  const rt_gt1 = rateAgg(gt1_kd, tot_kd)
  const rt_gt3 = rateAgg(gt3_kd, tot_kd)

  // 5.1 Loại 2 – aging
  const th_l2      = agg(loai2, 'CloseBal_00')
  const qh_l2      = subAgg(tot_l2, th_l2)
  const qh1_l2     = agg(loai2, 'CloseBal_01')
  const gt1_l2     = agg(loai2, 'CloseBal_01T')
  const gt3_l2     = agg(loai2, 'CloseBal_03T')
  const rt_qh_l2   = rateAgg(qh_l2,  tot_l2)
  const rt_gt3_l2  = rateAgg(gt3_l2, tot_l2)

  // ── Part B – Chi Tiết KD phụ trách ───────────────────────────────────────
  const kd_b1 = kd.filter(r => docYear(r) < 2022)
  const ht_b1 = ht.filter(r => docYear(r) < 2022)
  const td_b1 = td.filter(r => docYear(r) < 2022)

  const kd_b2 = kd.filter(r => docYear(r) >= 2022)
  const ht_b2 = ht.filter(r => docYear(r) >= 2022)
  const td_b2 = td.filter(r => docYear(r) >= 2022)

  const tot_b1    = agg(kd_b1)
  const tot_b2    = agg(kd_b2)

  const b2_th_ht  = agg(ht_b2, 'CloseBal_00')
  const b2_th_td  = agg(td_b2, 'CloseBal_00')
  const b2_th_kd  = addAgg(b2_th_ht, b2_th_td)
  const b2_tot_kd = agg(kd_b2)

  const b2_qh_ht  = subAgg(agg(ht_b2), b2_th_ht)
  const b2_qh_td  = subAgg(agg(td_b2), b2_th_td)
  const b2_qh_kd  = subAgg(b2_tot_kd, b2_th_kd)

  const b2_qh1_ht = agg(ht_b2, 'CloseBal_01')
  const b2_qh1_td = agg(td_b2, 'CloseBal_01')
  const b2_qh1_kd = addAgg(b2_qh1_ht, b2_qh1_td)

  const b2_gt1_ht = agg(ht_b2, 'CloseBal_01T')
  const b2_gt1_td = agg(td_b2, 'CloseBal_01T')
  const b2_gt1_kd = addAgg(b2_gt1_ht, b2_gt1_td)

  const b2_gt3_ht = agg(ht_b2, 'CloseBal_03T')
  const b2_gt3_td = agg(td_b2, 'CloseBal_03T')
  const b2_gt3_kd = addAgg(b2_gt3_ht, b2_gt3_td)

  const b2_lt3_kd = addAgg(b2_qh1_kd, b2_gt1_kd)

  const b2_rt_qh  = rateAgg(b2_qh_kd,  b2_tot_kd)
  const b2_rt_gt1 = rateAgg(b2_gt1_kd, b2_tot_kd)
  const b2_rt_gt3 = rateAgg(b2_gt3_kd, b2_tot_kd)

  // ─── Builder helper ───────────────────────────────────────────────────────
  const r = (id, stt, hanTT, noiDung, ma, data, opts = {}) => ({
    id, stt, hanTT, noiDung, ma, data,
    isRate:        opts.isRate        ?? false,
    isToggle:      opts.isToggle      ?? false,
    togglesGroup:  opts.togglesGroup  ?? null,
    isSummary:     opts.isSummary     ?? false,
    isSectionHead: opts.isSectionHead ?? false,
    indent:        opts.indent        ?? 0,
    collapseKeys:  opts.collapseKeys  ?? [],
  })

  return [
    // ═══════════════════════════════════════════════════════════════════════
    // PHẦN A – Tổng công nợ phải thu
    // ═══════════════════════════════════════════════════════════════════════
    r('groupA', 'A', null, 'Tổng công nợ phải thu', null, tot_all,
      { indent:0, isToggle:true, togglesGroup:'A' }),

    // 1 – Xuất nhập khẩu (DeptName empty & nhomLoaiHinh empty)
    r('g1', '1', null, 'Xuất nhập khẩu', null, tot_g1,
      { indent:1, collapseKeys:['A'] }),

    // 2 – Trang thiết bị (DeptName = Phòng Trang Thiết Bị)
    r('g2', '2', null, 'Trang thiết bị', null, tot_g2,
      { indent:1, collapseKeys:['A'] }),

    // 3 – Tòa nhà (= 0)
    r('g3', '3', null, 'Tòa nhà', null, { ...ZERO },
      { indent:1, collapseKeys:['A'] }),

    // 4 – Khác (= 0)
    r('g4', '4', null, 'Khác (kho...)', null, { ...ZERO },
      { indent:1, collapseKeys:['A'] }),

    // 5 – Kinh Doanh (header toggle group '5')
    r('g5', '5', null, 'Kinh Doanh', null, tot_g5,
      { indent:1, isToggle:true, togglesGroup:'5', collapseKeys:['A'] }),

    // 5.1 Công Ty Hỗ trợ (Loại 2) – toggle 'loai2'
    r('loai2', '5.1', null, 'Công Ty Hỗ trợ', 'Loại 2', tot_l2,
      { indent:2, isToggle:true, togglesGroup:'loai2', collapseKeys:['A','5'] }),

    r('th_l2',      '5.1.1',   'Trong hạn thanh toán', 'Công Ty Hỗ trợ', null, th_l2,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','loai2'] }),
    r('qh_l2',      '5.1.2',   'Quá hạn thanh toán',  'Công Ty Hỗ trợ', null, qh_l2,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','loai2'] }),
    r('qh_rate_l2',  null,      'Quá hạn thanh toán',  'Tỷ lệ %',        null, rt_qh_l2,
      { indent:4, isRate:true,        collapseKeys:['A','5','loai2'] }),
    r('qh1_l2',     '5.1.2.1', 'Quá hạn < 1 tháng',  'Công Ty Hỗ trợ', null, qh1_l2,
      { indent:3, collapseKeys:['A','5','loai2'] }),
    r('gt1_l2',     '5.1.2.2', 'Quá hạn > 1 tháng',  'Công Ty Hỗ trợ', null, gt1_l2,
      { indent:3, collapseKeys:['A','5','loai2'] }),
    r('gt3_l2',     '5.1.2.3', 'Quá hạn > 3 tháng',  'Công Ty Hỗ trợ', 'x', gt3_l2,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','loai2'] }),
    r('gt3_rate_l2', null,      'Quá hạn > 3 tháng',  'Tỷ lệ %',        null, rt_gt3_l2,
      { indent:4, isRate:true,        collapseKeys:['A','5','loai2'] }),

    // 5.2 Tính phí
    r('tp', '5.2', null, 'Tính Phí', 'Loại 1', tot_tp,
      { indent:2, collapseKeys:['A','5'] }),

    // 5.3 Lãi hỗ trợ vốn (= 0 trong data)
    r('lai_htv', '5.3', null, 'Lãi hỗ trợ vốn', 'Loại 1', { ...ZERO },
      { indent:2, collapseKeys:['A','5'] }),

    // 5.4 Kinh doanh theo dõi – toggle 'kd'
    r('kd', '5.4', null, 'Kinh doanh theo dõi', 'Loại 1', tot_kd,
      { indent:2, isToggle:true, togglesGroup:'kd', collapseKeys:['A','5'] }),

    // 5.4.1 Trong hạn
    r('th_kd', '5.4.1', 'Trong hạn thanh toán', 'KD phụ trách', null, th_kd,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','kd'] }),
    r('th_ht',  null,   'Trong hạn thanh toán', 'Hợp tác',      null, th_ht,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('th_td',  null,   'Trong hạn thanh toán', 'Tự doanh',     null, th_td,
      { indent:4, collapseKeys:['A','5','kd'] }),

    // 5.4.2 Quá hạn chung
    r('qh_kd',  '5.4.2', 'Quá hạn thanh toán', 'KD phụ trách', null, qh_kd,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','kd'] }),
    r('qh_ht',   null,   'Quá hạn thanh toán', 'Hợp tác',      null, qh_ht,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('qh_td',   null,   'Quá hạn thanh toán', 'Tự doanh',     null, qh_td,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('qh_rate', null,   'Quá hạn thanh toán', 'Tỷ lệ %',      null, rt_qh,
      { indent:4, isRate:true, collapseKeys:['A','5','kd'] }),

    // 5.4.2.1 QH < 1 tháng
    r('qh1_kd',  '5.4.2.1', 'Quá hạn < 1 tháng', 'KD phụ trách', null, qh1_kd,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','kd'] }),
    r('qh1_ht',   null,     'Quá hạn < 1 tháng', 'Hợp tác',      null, qh1_ht,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('qh1_td',   null,     'Quá hạn < 1 tháng', 'Tự doanh',     null, qh1_td,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('qh1_rate', null,     'Quá hạn < 1 tháng', 'Tỷ lệ %',      null, rt_qh1,
      { indent:4, isRate:true, collapseKeys:['A','5','kd'] }),

    // 5.4.2.1 QH > 1 tháng
    r('gt1_kd',  '5.4.2.1', 'Quá hạn > 1 tháng', 'KD phụ trách', 'x', gt1_kd,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','kd'] }),
    r('gt1_ht',   null,     'Quá hạn > 1 tháng', 'Hợp tác',      'x', gt1_ht,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('gt1_td',   null,     'Quá hạn > 1 tháng', 'Tự doanh',     null, gt1_td,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('gt1_rate', null,     'Quá hạn > 1 tháng', 'Tỷ lệ %',      null, rt_gt1,
      { indent:4, isRate:true, collapseKeys:['A','5','kd'] }),

    // 5.4.2.2 QH > 3 tháng
    r('gt3_kd',  '5.4.2.2', 'Quá hạn > 3 tháng', 'KD phụ trách', 'x', gt3_kd,
      { indent:3, isSectionHead:true, collapseKeys:['A','5','kd'] }),
    r('gt3_ht',   null,     'Quá hạn > 3 tháng', 'Hợp tác',      'x', gt3_ht,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('gt3_td',   null,     'Quá hạn > 3 tháng', 'Tự doanh',     null, gt3_td,
      { indent:4, collapseKeys:['A','5','kd'] }),
    r('gt3_rate', null,     'Quá hạn > 3 tháng', 'Tỷ lệ %',      null, rt_gt3,
      { indent:4, isRate:true, collapseKeys:['A','5','kd'] }),

    // ═══════════════════════════════════════════════════════════════════════
    // PHẦN B – Chi Tiết Công nợ KD phụ trách
    // ═══════════════════════════════════════════════════════════════════════
    r('groupB', 'B', null, 'Chi Tiết Công nợ KD phụ trách', 'Loại 1', tot_kd,
      { indent:0, isToggle:true, togglesGroup:'B' }),

    r('b1', '1', 'Trước năm 2022',        'KD phụ trách', null, tot_b1,
      { indent:1, collapseKeys:['B'] }),
    r('b2', '2', 'Từ năm 2022 trở về sau', 'KD phụ trách', null, tot_b2,
      { indent:1, isSectionHead:true, collapseKeys:['B'] }),

    r('b2_th',      '2.1',    'Trong hạn thanh toán', 'Trong hạn',    null, b2_th_kd,
      { indent:2, collapseKeys:['B'] }),

    r('b2_qh_kd',  '2.2',    'Quá hạn thanh toán',  'KD phụ trách', null, b2_qh_kd,
      { indent:2, isSectionHead:true, collapseKeys:['B'] }),
    r('b2_qh_ht',   null,    'Quá hạn thanh toán',  'Hợp tác',      null, b2_qh_ht,
      { indent:3, collapseKeys:['B'] }),
    r('b2_qh_td',   null,    'Quá hạn thanh toán',  'Tự doanh',     null, b2_qh_td,
      { indent:3, collapseKeys:['B'] }),
    r('b2_qh_rate', null,    'Quá hạn thanh toán',  'Tỷ lệ %',      null, b2_rt_qh,
      { indent:3, isRate:true, collapseKeys:['B'] }),

    r('b2_qh1',    '2.2.1a', 'QH < 1 tháng',        'KD phụ trách', null, b2_qh1_kd,
      { indent:2, collapseKeys:['B'] }),

    r('b2_gt1_kd', '2.2.2a', 'QH ≥ 1 tháng',        'KD phụ trách', null, b2_gt1_kd,
      { indent:2, isSectionHead:true, collapseKeys:['B'] }),
    r('b2_gt1_ht',  null,    'QH ≥ 1 tháng',        'Hợp tác',      null, b2_gt1_ht,
      { indent:3, collapseKeys:['B'] }),
    r('b2_gt1_td',  null,    'QH ≥ 1 tháng',        'Tự doanh',     null, b2_gt1_td,
      { indent:3, collapseKeys:['B'] }),
    r('b2_gt1_rate',null,    'QH ≥ 1 tháng',        'Tỷ lệ %',      null, b2_rt_gt1,
      { indent:3, isRate:true, collapseKeys:['B'] }),

    r('b2_lt3',    '2.2.1b', 'QH < 3 tháng',        'KD phụ trách', null, b2_lt3_kd,
      { indent:2, collapseKeys:['B'] }),

    r('b2_gt3_kd', '2.2.2b', 'QH ≥ 3 tháng',        'KD phụ trách', 'x', b2_gt3_kd,
      { indent:2, isSectionHead:true, collapseKeys:['B'] }),
    r('b2_gt3_ht',  null,    'QH ≥ 3 tháng',        'Hợp tác',      'x', b2_gt3_ht,
      { indent:3, collapseKeys:['B'] }),
    r('b2_gt3_td',  null,    'QH ≥ 3 tháng',        'Tự doanh',     null, b2_gt3_td,
      { indent:3, collapseKeys:['B'] }),
    r('b2_gt3_rate',null,    'QH ≥ 3 tháng',        'Tỷ lệ %',      null, b2_rt_gt3,
      { indent:3, isRate:true, collapseKeys:['B'] }),

    // ═══════════════════════════════════════════════════════════════════════
    // TỔNG – cuối bảng (tương đương "Tổng 131" trong Excel)
    // ═══════════════════════════════════════════════════════════════════════
    r('tong', null, null, 'Tổng công nợ phải thu (131)', null, tot_all,
      { indent:0, isSummary:true }),
  ]
}

// ─── Tooltip % ────────────────────────────────────────────────────────────────

function PctTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }}>
          {e.name}: {e.value != null ? `${Number(e.value).toFixed(2)}%` : '-'}
        </p>
      ))}
    </div>
  )
}

// ─── Biểu đồ tỷ lệ QH theo chi nhánh ────────────────────────────────────────

function BranchRateChart({ rows }) {
  const qhRow  = rows.find(r => r.id === 'qh_rate')
  const gt3Row = rows.find(r => r.id === 'gt3_rate')
  if (!qhRow && !gt3Row) return null

  const data = BRANCH_COLS.map(b => ({
    branch:     b.label,
    'QH chung': qhRow?.data[b.key]  != null ? +Number(qhRow.data[b.key]).toFixed(2)  : null,
    'QH >3 th': gt3Row?.data[b.key] != null ? +Number(gt3Row.data[b.key]).toFixed(2) : null,
  }))

  return (
    <ChartCard title="Tỷ lệ Quá hạn theo Chi nhánh (KD theo dõi)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
          <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
          <Tooltip content={<PctTooltip />} />
          <Legend />
          <Bar dataKey="QH chung" fill="#f59e0b" radius={[4,4,0,0]} minPointSize={2} />
          <Bar dataKey="QH >3 th" fill="#ef4444" radius={[4,4,0,0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Monthly trend charts ─────────────────────────────────────────────────────

function MonthlyTrendCharts({ activeBranch, selectedMonth }) {
  const brKey = activeBranch || 'total'

  // Đánh dấu điểm đang được chọn
  const activeCfg = MONTHS_CONFIG.find(m => m.fileKey === selectedMonth)

  const trendData = monthlyData.map(m => {
    const cfg = MONTHS_CONFIG.find(c => c.short === m.short)
    const isActive = cfg?.fileKey === selectedMonth
    return {
      month:        m.short,
      'Tổng 131':   m.tong131?.[brKey]    != null ? +(m.tong131[brKey]    / 1e9).toFixed(1) : null,
      'KD theo dõi': m.kd_theo_doi?.[brKey] != null ? +(m.kd_theo_doi[brKey] / 1e9).toFixed(1) : null,
      _active: isActive,
    }
  })

  const rateData = monthlyData.map(m => {
    const cfg = MONTHS_CONFIG.find(c => c.short === m.short)
    const isActive = cfg?.fileKey === selectedMonth
    return {
      month:      m.short,
      'QH chung': m.qh_rate?.[brKey]     != null ? +(m.qh_rate[brKey]     * 100).toFixed(2) : null,
      'QH >3 th': m.qh_gt3_rate?.[brKey] != null ? +(m.qh_gt3_rate[brKey] * 100).toFixed(2) : null,
      _active: isActive,
    }
  })

  const branchLabel = activeBranch
    ? BRANCH_COLS.find(b => b.key === activeBranch)?.label
    : 'Tất cả chi nhánh'

  // Custom dot: phóng to điểm đang xem
  const ActiveDot = (color) => (props) => {
    const { cx, cy, payload } = props
    if (!payload._active) return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} />
    return <circle key={`dot-active-${cx}-${cy}`} cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartCard title={`Xu hướng Công nợ theo tháng — ${branchLabel}${activeCfg ? ` · Đang xem: ${activeCfg.month}` : ''}`}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `${v}tỷ`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, name) => [`${v} tỷ`, name]} />
            <Legend />
            <Line type="monotone" dataKey="Tổng 131"    stroke="#3b82f6" strokeWidth={2} dot={ActiveDot('#3b82f6')} connectNulls />
            <Line type="monotone" dataKey="KD theo dõi" stroke="#10b981" strokeWidth={2} dot={ActiveDot('#10b981')} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`Xu hướng Tỷ lệ Quá hạn theo tháng — ${branchLabel}${activeCfg ? ` · Đang xem: ${activeCfg.month}` : ''}`}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rateData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, name) => [`${v}%`, name]} />
            <Legend />
            <Line type="monotone" dataKey="QH chung" stroke="#f59e0b" strokeWidth={2} dot={ActiveDot('#f59e0b')} connectNulls />
            <Line type="monotone" dataKey="QH >3 th" stroke="#ef4444" strokeWidth={2} dot={ActiveDot('#ef4444')} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

function KpiSection({ rows, activeBranch }) {
  const k      = activeBranch || 'total'
  const get    = id => rows.find(r => r.id === id)?.data[k]
  const pct    = v  => v != null ? `${Number(v).toFixed(2)}%` : '-'

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <KPICard title="Tổng CN phải thu"    value={fmtCurrency(get('tong'))}     subLabel="Tất cả nhóm"           icon={AssessmentIcon}   color="blue"   />
      <KPICard title="KD theo dõi"          value={fmtCurrency(get('kd'))}       subLabel="Hợp tác + Tự doanh"    icon={TrendingUpIcon}   color="green"  />
      <KPICard title="Tỷ lệ QH chung"       value={pct(get('qh_rate'))}          subLabel="QH / Tổng KD theo dõi" icon={WarningAmberIcon} color="orange" />
      <KPICard title="Tỷ lệ QH > 3 tháng"  value={pct(get('gt3_rate'))}         subLabel="Rủi ro cần xử lý"      icon={ErrorIcon}        color="red"    />
    </div>
  )
}

// ─── Bảng báo cáo ─────────────────────────────────────────────────────────────

function ReportTable({ rows, activeBranch, search }) {
  const [collapsed, setCollapsed] = useState(new Set())

  function toggle(groupId) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }

  const visibleCols = activeBranch ? [BRANCH_COLS.find(b => b.key === activeBranch)] : BRANCH_COLS
  const showTotal   = !activeBranch
  const q           = search.toLowerCase().trim()

  const visible = useMemo(() => rows.filter(row => {
    if (row.collapseKeys.some(k => collapsed.has(k))) return false
    if (q) {
      const text = `${row.noiDung ?? ''} ${row.hanTT ?? ''} ${row.stt ?? ''}`.toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  }), [rows, collapsed, q])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-24">STT</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-44">Hạn Thanh toán</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 min-w-56">Nội dung</th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-16">Mã</th>
            {showTotal && (
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 min-w-28">Tổng</th>
            )}
            {visibleCols.map(b => (
              <th key={b.key} className="px-3 py-3 text-right text-xs font-semibold text-blue-600 min-w-24">
                {b.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {visible.map(row => {
            const { id, stt, hanTT, noiDung, ma, data,
                    isRate, isToggle, togglesGroup, isSummary, isSectionHead, indent } = row
            const isCollapsed = togglesGroup ? collapsed.has(togglesGroup) : false

            let rowCls = 'border-b '
            if      (isSummary)     rowCls += 'bg-slate-800 border-slate-700'
            else if (isToggle)      rowCls += 'bg-slate-100 border-slate-300'
            else if (isSectionHead) rowCls += 'bg-gray-100 border-gray-200'
            else if (isRate)        rowCls += 'bg-amber-50 border-amber-100'
            else                    rowCls += 'border-gray-50 hover:bg-gray-50 transition-colors'

            const labelCls = isSummary     ? 'text-white font-bold'
              : isToggle       ? 'text-slate-800 font-bold'
              : isSectionHead  ? 'text-gray-700 font-semibold'
              : isRate         ? 'text-amber-800 font-semibold'
              : 'text-gray-700'

            const numCls = isSummary ? 'text-white font-bold'
              : isRate     ? 'text-amber-700 font-bold'
              : (isToggle || isSectionHead) ? 'text-gray-800 font-semibold'
              : 'text-gray-600'

            const dimCls  = isSummary ? 'text-slate-400' : 'text-gray-400'
            const getVal  = k => fmtVal(data?.[k], isRate)

            return (
              <tr key={id} className={rowCls}>
                <td className={`px-3 py-2.5 font-mono text-xs ${dimCls}`}>{stt ?? ''}</td>
                <td className={`px-3 py-2.5 text-xs ${dimCls}`}>{hanTT ?? ''}</td>

                <td className="px-3 py-2">
                  <div className="flex items-center gap-0.5">
                    <span style={{ minWidth: `${indent * 14}px`, display: 'inline-block' }} />
                    {isToggle && (
                      <button
                        onClick={() => toggle(togglesGroup)}
                        className="mr-1 flex-shrink-0 hover:text-blue-600 transition-colors"
                      >
                        {isCollapsed
                          ? <ChevronRightIcon sx={{ fontSize: 15 }} />
                          : <ExpandMoreIcon   sx={{ fontSize: 15 }} />}
                      </button>
                    )}
                    <span className={`text-xs leading-snug ${labelCls}`}>{noiDung ?? ''}</span>
                  </div>
                </td>

                <td className={`px-3 py-2.5 text-xs text-center ${dimCls}`}>{ma ?? ''}</td>

                {showTotal && (
                  <td className={`px-3 py-2.5 text-right text-xs ${numCls}`}>{getVal('total')}</td>
                )}
                {visibleCols.map(b => (
                  <td key={b.key} className={`px-3 py-2.5 text-right text-xs ${numCls}`}>
                    {getVal(b.key)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>

      {visible.length === 0 && (
        <p className="text-center text-gray-400 py-10 text-sm">Không có kết quả phù hợp</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CongNoReport() {
  const [branch,       setBranch]       = useState('')
  const [search,       setSearch]       = useState('')
  const [selectedMonth, setSelectedMonth] = useState('2026-04')   // default = tháng có sẵn
  const [monthRecords, setMonthRecords] = useState(defaultData)   // khởi tạo ngay, không cần load
  const [isLoading,    setIsLoading]    = useState(false)

  // Dynamic load khi user đổi tháng
  useEffect(() => {
    if (selectedMonth === '2026-04') {
      setMonthRecords(defaultData)
      return
    }
    const filePath = `../data/congno-${selectedMonth}.json`
    const loader   = MONTH_FILES[filePath]
    if (!loader) return   // file chưa được export, bỏ qua
    setIsLoading(true)
    loader()
      .then(m => { setMonthRecords(m.default); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [selectedMonth])

  const hasActive = Boolean(branch || search)
  function handleReset() { setBranch(''); setSearch(''); setSelectedMonth('2026-04') }

  const activeMthCfg   = MONTHS_CONFIG.find(m => m.fileKey === selectedMonth)
  const monthLabel     = activeMthCfg?.month ?? selectedMonth
  const branchLabel    = branch ? BRANCH_COLS.find(b => b.key === branch)?.label : 'Tất cả chi nhánh'

  const filteredRecords = useMemo(() => {
    if (!branch) return monthRecords
    return monthRecords.filter(r => getBranchKey(r) === branch)
  }, [branch, monthRecords])

  const rows = useMemo(() => buildReportRows(filteredRecords), [filteredRecords])

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="BÁO CÁO TỶ LỆ CÔNG NỢ QUÁ HẠN KHỐI KINH DOANH"
        subtitle={`Tháng: ${monthLabel} · ${monthRecords.length.toLocaleString()} giao dịch · ${branchLabel}`}
      />

      <KpiSection rows={rows} activeBranch={branch} />

      <MonthlyTrendCharts activeBranch={branch} selectedMonth={selectedMonth} />

      <BranchRateChart rows={rows} />

      <ChartCard
        title={`Chi Tiết Tỷ Lệ Công Nợ Quá Hạn — ${monthLabel}`}
        action={
          <FilterBar hasActiveFilters={hasActive} onReset={handleReset}>
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm STT, nội dung..." width="w-48" />
            <SelectFilter
              value={selectedMonth}
              onChange={setSelectedMonth}
              options={MONTH_OPTIONS}
              placeholder="Chọn tháng"
            />
            <SelectFilter value={branch} onChange={setBranch} options={BRANCH_OPTIONS} placeholder="Tất cả CN" />
          </FilterBar>
        }
        noPadding
      >
        {isLoading
          ? <p className="text-center text-gray-400 py-10 text-sm">Đang tải dữ liệu tháng {monthLabel}…</p>
          : <ReportTable rows={rows} activeBranch={branch} search={search} />
        }
      </ChartCard>
    </div>
  )
}
