import { useMemo, useState } from 'react'
import {
  getAllRecords, getPhanLoaiSummary, getCustomerSummaryByRecords,
  getUniqueBranches, formatCurrency, formatDate,
} from '../services/dataService'
import { formatAxisValue, CHART_MARGIN, GRID_STROKE, GRID_DASH } from '../utils/chartUtils'
import { useTableSort }  from '../hooks/useTableSort'
import { usePagination } from '../hooks/usePagination'
import SortableHeader    from '../components/SortableHeader'
import Pagination        from '../components/Pagination'
import ChartCard         from '../components/ChartCard'
import PageHeader        from '../components/PageHeader'
import EmptyTableRow     from '../components/EmptyTableRow'
import { FilterBar, SearchInput, SelectFilter } from '../components/FilterBar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ALL_RECORDS       = getAllRecords()
const BRANCH_OPTIONS    = getUniqueBranches()
const PHAN_LOAI_SUMMARY = getPhanLoaiSummary()
const PHAN_LOAI_OPTIONS = PHAN_LOAI_SUMMARY.map(item => item.name)

const PHAN_LOAI_STYLE = {
  'Loại 2':        { border: 'border-red-500',    bg: 'bg-red-50',    text: 'text-red-600',    badge: 'bg-red-100 text-red-700'       },
  'Loại 1':        { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700'  },
  'Chưa xác định': { border: 'border-gray-400',   bg: 'bg-gray-50',   text: 'text-gray-600',   badge: 'bg-gray-100 text-gray-500'     },
}

function PhanLoaiBadge({ value }) {
  const style = PHAN_LOAI_STYLE[value] || PHAN_LOAI_STYLE['Chưa xác định']
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>{value}</span>
  )
}

function PhanLoaiSummaryCards({ activeFilter, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {PHAN_LOAI_SUMMARY.map(item => {
        const style   = PHAN_LOAI_STYLE[item.name] || PHAN_LOAI_STYLE['Chưa xác định']
        const isActive = activeFilter === item.name
        return (
          <button
            key={item.name}
            onClick={() => onSelect(isActive ? '' : item.name)}
            className={`text-left rounded-2xl p-4 border-l-4 transition-all ${style.border} ${style.bg} ${
              isActive ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:opacity-80'
            }`}
          >
            <p className="text-xs text-gray-500 font-medium">{item.name}</p>
            <p className={`text-2xl font-bold mt-1 ${style.text}`}>{formatCurrency(item.amount)}</p>
            <p className="text-xs text-gray-400">{item.count.toLocaleString()} hóa đơn</p>
          </button>
        )
      })}
    </div>
  )
}

function TopCustomerBarChart({ data }) {
  return (
    <ChartCard title="Top 10 Khách Hàng theo Số Tiền">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ ...CHART_MARGIN, bottom: 60 }}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
          <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="amount" name="Số tiền" fill="#3b82f6" radius={[4,4,0,0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DebtClassification() {
  const [searchQuery,    setSearchQuery]    = useState('')
  const [branchFilter,   setBranchFilter]   = useState('')
  const [phanLoaiFilter, setPhanLoaiFilter] = useState('')

  const hasActiveFilters = Boolean(searchQuery || branchFilter || phanLoaiFilter)

  const filteredRecords = useMemo(() => {
    const result = []
    for (const r of ALL_RECORDS) {
      if (phanLoaiFilter && r.phanLoaiCongNo !== phanLoaiFilter) continue
      if (branchFilter   && r.branchName     !== branchFilter)   continue
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !r.displayName?.toLowerCase().includes(q) &&
          !r.CustomerCode?.toLowerCase().includes(q) &&
          !r.DocNo?.toLowerCase().includes(q)
        ) continue
      }
      result.push(r)
    }
    return result
  }, [searchQuery, branchFilter, phanLoaiFilter])

  const customerSummary = useMemo(
    () => getCustomerSummaryByRecords(filteredRecords),
    [filteredRecords]
  )

  const { sortedData, sortField, sortDirection, handleSortChange } = useTableSort(filteredRecords, 'CloseBal')
  const { pagedData, currentPage, totalPages, setCurrentPage, resetPage } = usePagination(sortedData)

  function handleFilterReset()           { setSearchQuery(''); setBranchFilter(''); setPhanLoaiFilter(''); resetPage() }
  function handleSearchInput(value)      { setSearchQuery(value);    resetPage() }
  function handleBranchSelect(value)     { setBranchFilter(value);   resetPage() }
  function handlePhanLoaiSelect(value)   { setPhanLoaiFilter(value); resetPage() }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Phân Loại Công Nợ"
        subtitle="Phân bổ công nợ theo mức độ rủi ro — click card để lọc"
      />

      <PhanLoaiSummaryCards activeFilter={phanLoaiFilter} onSelect={handlePhanLoaiSelect} />

      <TopCustomerBarChart data={customerSummary} />

      <ChartCard
        action={
          <FilterBar hasActiveFilters={hasActiveFilters} onReset={handleFilterReset}>
            <SearchInput  value={searchQuery}    onChange={handleSearchInput}    placeholder="Tìm tên KH, mã KH, số HĐ..." width="w-72" />
            <SelectFilter value={branchFilter}   onChange={handleBranchSelect}   options={BRANCH_OPTIONS}   placeholder="Tất cả chi nhánh" />
            <SelectFilter value={phanLoaiFilter} onChange={handlePhanLoaiSelect} options={PHAN_LOAI_OPTIONS} placeholder="Tất cả phân loại" />
            <span className="text-sm text-gray-400 ml-auto">{filteredRecords.length} kết quả</span>
          </FilterBar>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <SortableHeader label="Mã KH"      field="CustomerCode" sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Khách hàng" field="displayName"  sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Chi nhánh"  field="branchName"   sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Số HĐ"      field="DocNo"        sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Ngày HĐ"    field="DocDate"      sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Số tiền"    field="CloseBal"     sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Quá hạn"    field="overdueDays"  sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <th className="px-4 py-3 text-center text-gray-500 font-medium">Phân loại</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((record, index) => (
                <tr key={record._id?.$oid || index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{record.CustomerCode}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800 max-w-xs">
                    <p className="truncate">{record.displayName}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{record.branchName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{record.DocNo}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{formatDate(record.DocDate)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(record.CloseBal)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">
                    {record.overdueDays > 0 ? `${record.overdueDays} ngày` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PhanLoaiBadge value={record.phanLoaiCongNo} />
                  </td>
                </tr>
              ))}
              {pagedData.length === 0 && <EmptyTableRow colSpan={8} />}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRecords.length}
          onPageChange={setCurrentPage}
        />
      </ChartCard>
    </div>
  )
}
