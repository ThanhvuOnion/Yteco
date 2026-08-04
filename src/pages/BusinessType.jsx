import { useMemo, useState } from 'react'
import {
  getDebtByNhomLoaiHinh, getDebtByJobName, formatCurrency, CHART_COLORS,
} from '../services/dataService'
import { formatAxisValue, GRID_STROKE, GRID_DASH } from '../utils/chartUtils'
import { useTableSort }  from '../hooks/useTableSort'
import { usePagination } from '../hooks/usePagination'
import SortableHeader    from '../components/SortableHeader'
import Pagination        from '../components/Pagination'
import ChartCard         from '../components/ChartCard'
import PageHeader        from '../components/PageHeader'
import EmptyTableRow     from '../components/EmptyTableRow'
import { FilterBar, SearchInput, SelectFilter } from '../components/FilterBar'
import { NhomLoaiHinhBadge, JobNameLabel }       from '../components/NhomBadge'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const ALL_JOB_DATA  = getDebtByJobName()
const ALL_NHOM_DATA = getDebtByNhomLoaiHinh()

const NHOM_OPTIONS = []
for (const job of ALL_JOB_DATA) {
  if (!NHOM_OPTIONS.includes(job.nhomLoaiHinh)) {
    NHOM_OPTIONS.push(job.nhomLoaiHinh)
  }
}
NHOM_OPTIONS.sort()

// ─── Sub-components ───────────────────────────────────────────────────────────

function NhomSummaryCards({ data }) {
  const totalAmount = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {data.map((item, index) => (
        <div
          key={item.name}
          className="bg-white rounded-2xl p-4 shadow-sm border-l-4"
          style={{ borderColor: CHART_COLORS[index % CHART_COLORS.length] }}
        >
          <div className="text-xs text-gray-500 font-medium mb-1">
            <NhomLoaiHinhBadge value={item.name} />
          </div>
          <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(item.value)}</p>
          <p className="text-xs text-gray-400">{item.count.toLocaleString()} giao dịch</p>
          <p className="text-xs font-medium mt-1" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
            {totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(1) : 0}%
          </p>
        </div>
      ))}
    </div>
  )
}

function NhomPieWithBars({ data }) {
  const totalAmount = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <ChartCard title="Phân bổ theo Nhóm">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40}>
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-3">
          {data.map((item, index) => {
            const percentage = totalAmount > 0 ? (item.value / totalAmount * 100) : 0
            return (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-0.5">
                  <NhomLoaiHinhBadge value={item.name} />
                  <span className="text-gray-500">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${percentage}%`, background: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ChartCard>
  )
}

function TopJobBarChart({ data }) {
  return (
    <ChartCard title="Top 10 Loại Hình theo CN">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" tickFormatter={formatAxisValue} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={130} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="amount" name="Số tiền" fill="#3b82f6" radius={[0,4,4,0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BusinessType() {
  const [searchQuery, setSearchQuery] = useState('')
  const [nhomFilter,  setNhomFilter]  = useState('')

  const hasActiveFilters = Boolean(searchQuery || nhomFilter)

  const filteredJobData = useMemo(() => {
    return ALL_JOB_DATA.filter(job => {
      if (nhomFilter  && job.nhomLoaiHinh !== nhomFilter)                              return false
      if (searchQuery && !job.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [searchQuery, nhomFilter])

  const { sortedData, sortField, sortDirection, handleSortChange } = useTableSort(filteredJobData, 'amount')
  const { pagedData, currentPage, totalPages, setCurrentPage, resetPage } = usePagination(sortedData, 12)

  function handleFilterReset()       { setSearchQuery(''); setNhomFilter(''); resetPage() }
  function handleSearchInput(value)  { setSearchQuery(value); resetPage() }
  function handleNhomSelect(value)   { setNhomFilter(value);  resetPage() }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Loại Hình Kinh Doanh"
        subtitle="Phân bổ công nợ theo nhóm và loại hình"
      />

      <NhomSummaryCards data={ALL_NHOM_DATA} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NhomPieWithBars data={ALL_NHOM_DATA} />
        <TopJobBarChart  data={ALL_JOB_DATA} />
      </div>

      <ChartCard
        title="Chi Tiết Loại Hình"
        action={
          <FilterBar hasActiveFilters={hasActiveFilters} onReset={handleFilterReset}>
            <SearchInput  value={searchQuery} onChange={handleSearchInput} placeholder="Tìm tên loại hình..." />
            <SelectFilter value={nhomFilter}  onChange={handleNhomSelect}  options={NHOM_OPTIONS} placeholder="Tất cả nhóm" />
          </FilterBar>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <SortableHeader label="Tên loại hình" field="name"         sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Nhóm"          field="nhomLoaiHinh" sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Số giao dịch"  field="count"        sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Tổng CN"       field="amount"       sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
              </tr>
            </thead>
            <tbody>
              {pagedData.map(job => (
                <tr key={job.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5"><JobNameLabel value={job.name} /></td>
                  <td className="px-4 py-2.5"><NhomLoaiHinhBadge value={job.nhomLoaiHinh} /></td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{job.count.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(job.amount)}</td>
                </tr>
              ))}
              {pagedData.length === 0 && (
                <EmptyTableRow colSpan={4} />
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredJobData.length}
          onPageChange={setCurrentPage}
        />
      </ChartCard>
    </div>
  )
}
