import { useMemo, useState } from 'react'
import {
  getLoai2Records, getLoai2CustomerSummary, getUniqueBranches,
  formatCurrency, formatDate,
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
import WarningAmberIcon  from '@mui/icons-material/WarningAmber'
import ReceiptIcon       from '@mui/icons-material/Receipt'
import GroupsIcon        from '@mui/icons-material/Groups'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ALL_LOAI2      = getLoai2Records()
const BRANCH_OPTIONS = getUniqueBranches()

// ─── Sub-components ───────────────────────────────────────────────────────────

function Loai2KpiRow({ recordCount, totalAmount, uniqueCustomers }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3 border-l-4 border-red-500">
        <ReceiptIcon className="text-red-500" />
        <div>
          <p className="text-xs text-gray-500">Tổng hóa đơn Loại 2</p>
          <p className="text-2xl font-bold text-red-600">{recordCount}</p>
        </div>
      </div>
      <div className="bg-orange-50 rounded-2xl p-4 flex items-center gap-3 border-l-4 border-orange-500">
        <WarningAmberIcon className="text-orange-500" />
        <div>
          <p className="text-xs text-gray-500">Tổng số tiền Loại 2</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</p>
        </div>
      </div>
      <div className="bg-yellow-50 rounded-2xl p-4 flex items-center gap-3 border-l-4 border-yellow-500">
        <GroupsIcon className="text-yellow-600" />
        <div>
          <p className="text-xs text-gray-500">Số khách hàng Loại 2</p>
          <p className="text-2xl font-bold text-yellow-600">{uniqueCustomers}</p>
        </div>
      </div>
    </div>
  )
}

function TopCustomerBarChart({ data }) {
  return (
    <ChartCard title="Top 10 Khách Hàng theo Số Tiền Loại 2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ ...CHART_MARGIN, bottom: 60 }}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
          <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="amount" name="Số tiền" fill="#ef4444" radius={[4,4,0,0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Type2Debts() {
  const [searchQuery,  setSearchQuery]  = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  const hasActiveFilters = Boolean(searchQuery || branchFilter)

  const filteredRecords = useMemo(() => {
    return ALL_LOAI2.filter(record => {
      if (branchFilter && record.branchName !== branchFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          record.displayName?.toLowerCase().includes(query)  ||
          record.CustomerCode?.toLowerCase().includes(query) ||
          record.DocNo?.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [searchQuery, branchFilter])

  const customerSummary = useMemo(
    () => getLoai2CustomerSummary(filteredRecords),
    [filteredRecords]
  )

  const { sortedData, sortField, sortDirection, handleSortChange } = useTableSort(filteredRecords, 'CloseBal')
  const { pagedData, currentPage, totalPages, setCurrentPage, resetPage } = usePagination(sortedData)

  function handleFilterReset()        { setSearchQuery(''); setBranchFilter(''); resetPage() }
  function handleSearchInput(value)   { setSearchQuery(value);  resetPage() }
  function handleBranchSelect(value)  { setBranchFilter(value); resetPage() }

  let totalAmount     = 0
  let uniqueCustomers = 0
  const seenCustomers = []
  for (const r of filteredRecords) {
    totalAmount += r.CloseBal || 0
    if (!seenCustomers.includes(r.CustomerCode)) {
      seenCustomers.push(r.CustomerCode)
      uniqueCustomers += 1
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Công Nợ Loại 2"
        subtitle="Các khoản công nợ rủi ro cao cần ưu tiên xử lý"
      />

      <Loai2KpiRow
        recordCount={filteredRecords.length}
        totalAmount={totalAmount}
        uniqueCustomers={uniqueCustomers}
      />

      <TopCustomerBarChart data={customerSummary} />

      <ChartCard
        action={
          <FilterBar hasActiveFilters={hasActiveFilters} onReset={handleFilterReset}>
            <SearchInput  value={searchQuery}  onChange={handleSearchInput}  placeholder="Tìm tên KH, mã KH, số HĐ..." width="w-72" />
            <SelectFilter value={branchFilter} onChange={handleBranchSelect} options={BRANCH_OPTIONS} placeholder="Tất cả chi nhánh" />
            <span className="text-sm text-gray-400 ml-auto">{filteredRecords.length} kết quả</span>
          </FilterBar>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <SortableHeader label="Mã KH"      field="CustomerCode"  sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Khách hàng" field="displayName"   sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Chi nhánh"  field="branchName"    sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Số HĐ"      field="DocNo"         sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Ngày HĐ"    field="DocDate"       sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Số tiền"    field="CloseBal"      sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Quá hạn"    field="overdueDays"   sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <th className="px-4 py-3 text-center text-gray-500 font-medium">Loại</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((record, index) => (
                <tr key={record._id?.$oid || index} className="border-b border-gray-50 hover:bg-red-50 transition-colors">
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
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Loại 2</span>
                  </td>
                </tr>
              ))}
              {pagedData.length === 0 && (
                <EmptyTableRow colSpan={8} />
              )}
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
