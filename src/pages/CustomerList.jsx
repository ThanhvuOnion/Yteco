import { useState, useMemo } from 'react'
import {
  getCustomerList, getUniqueBranches, getUniqueNhomLoaiHinh,
  formatCurrency,
} from '../services/dataService'
import { useTableSort }  from '../hooks/useTableSort'
import { usePagination } from '../hooks/usePagination'
import SortableHeader    from '../components/SortableHeader'
import StatusBadge       from '../components/StatusBadge'
import Pagination        from '../components/Pagination'
import ChartCard         from '../components/ChartCard'
import PageHeader        from '../components/PageHeader'
import EmptyTableRow     from '../components/EmptyTableRow'
import { FilterBar, SearchInput, SelectFilter } from '../components/FilterBar'
import { NhomLoaiHinhBadge } from '../components/NhomBadge'

const ALL_CUSTOMERS  = getCustomerList()
const BRANCH_OPTIONS = getUniqueBranches()
const NHOM_OPTIONS   = getUniqueNhomLoaiHinh()

const OVERDUE_STATUS_OPTIONS = [
  { value: 'inDue',    label: 'Trong hạn' },
  { value: '1to30',    label: '1-30 ngày' },
  { value: '31to90',   label: '31-90 ngày' },
  { value: 'over90',   label: '>90 ngày'   },
]

function matchesOverdueStatus(customer, statusFilter) {
  const days = customer.maxOverdueDays
  switch (statusFilter) {
    case 'inDue':  return days === 0
    case '1to30':  return days > 0  && days <= 30
    case '31to90': return days > 30 && days <= 90
    case 'over90': return days > 90
    default:       return true
  }
}

export default function CustomerList() {
  const [searchQuery,  setSearchQuery]  = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [nhomFilter,   setNhomFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const hasActiveFilters = Boolean(searchQuery || branchFilter || nhomFilter || statusFilter)

  const filteredCustomers = useMemo(() => {
    return ALL_CUSTOMERS.filter(customer => {
      if (branchFilter && customer.branchName !== branchFilter)              return false
      if (nhomFilter   && customer.nhomLoaiHinh !== nhomFilter)              return false
      if (statusFilter && !matchesOverdueStatus(customer, statusFilter))     return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return customer.name.toLowerCase().includes(query) || customer.code.toLowerCase().includes(query)
      }
      return true
    })
  }, [searchQuery, branchFilter, nhomFilter, statusFilter])

  const { sortedData, sortField, sortDirection, handleSortChange } = useTableSort(filteredCustomers, 'totalAmount')
  const { pagedData, currentPage, totalPages, setCurrentPage, resetPage } = usePagination(sortedData)

  function handleFilterReset()       { setSearchQuery(''); setBranchFilter(''); setNhomFilter(''); setStatusFilter(''); resetPage() }
  function handleSearchInput(value)  { setSearchQuery(value);  resetPage() }
  function handleBranchSelect(value) { setBranchFilter(value); resetPage() }
  function handleNhomSelect(value)   { setNhomFilter(value);   resetPage() }
  function handleStatusSelect(value) { setStatusFilter(value); resetPage() }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Danh sách Khách Hàng"
        subtitle={`${filteredCustomers.length} khách hàng`}
      />

      <FilterBar hasActiveFilters={hasActiveFilters} onReset={handleFilterReset}>
        <SearchInput  value={searchQuery}  onChange={handleSearchInput}  placeholder="Tìm tên hoặc mã KH..." />
        <SelectFilter value={branchFilter} onChange={handleBranchSelect} options={BRANCH_OPTIONS}         placeholder="Tất cả chi nhánh" />
        <SelectFilter value={nhomFilter}   onChange={handleNhomSelect}   options={NHOM_OPTIONS}           placeholder="Tất cả loại hình" />
        <SelectFilter value={statusFilter} onChange={handleStatusSelect} options={OVERDUE_STATUS_OPTIONS} placeholder="Tất cả trạng thái" />
      </FilterBar>

      <ChartCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <SortableHeader label="Mã KH"          field="code"           sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Tên khách hàng" field="name"           sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Chi nhánh"      field="branchName"     sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Loại hình"      field="nhomLoaiHinh"   sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Số HĐ"          field="invoiceCount"   sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Tổng CN"        field="totalAmount"    sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Quá hạn"        field="overdueAmount"  sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Ngày QH max"    field="maxOverdueDays" sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <th className="px-4 py-3 text-center text-gray-500 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map(customer => (
                <tr key={customer.code} className="border-b border-gray-50 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{customer.code}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-800 truncate">{customer.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{customer.branchName}</td>
                  <td className="px-4 py-3">
                    <NhomLoaiHinhBadge value={customer.nhomLoaiHinh} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{customer.invoiceCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(customer.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(customer.overdueAmount)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {customer.maxOverdueDays > 0 ? `${customer.maxOverdueDays} ngày` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge overdueDays={customer.maxOverdueDays} />
                  </td>
                </tr>
              ))}
              {pagedData.length === 0 && (
                <EmptyTableRow colSpan={9} message="Không tìm thấy kết quả" />
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCustomers.length}
          onPageChange={setCurrentPage}
        />
      </ChartCard>
    </div>
  )
}
