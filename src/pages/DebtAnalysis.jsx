import { useMemo, useState } from 'react'
import {
  getDebtByBranch, getDebtByYearAndBranch, getTopCustomers, getAgingBuckets,
  formatCurrency, CHART_COLORS, BUCKET_COLORS,
} from '../services/dataService'
import { formatAxisValue, CHART_MARGIN, GRID_STROKE, GRID_DASH } from '../utils/chartUtils'
import { useTableSort }  from '../hooks/useTableSort'
import SortableHeader    from '../components/SortableHeader'
import StatusBadge       from '../components/StatusBadge'
import ChartCard         from '../components/ChartCard'
import ChartTooltip      from '../components/ChartTooltip'
import PageHeader        from '../components/PageHeader'
import { FilterBar, SelectFilter } from '../components/FilterBar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const TOP_N_OPTIONS = [
  { value: '5',  label: 'Top 5'  },
  { value: '10', label: 'Top 10' },
  { value: '20', label: 'Top 20' },
]
const SORT_BY_OPTIONS = [
  { value: 'totalAmount',    label: 'Tổng CN'             },
  { value: 'overdueAmount',  label: 'Quá hạn'             },
  { value: 'maxOverdueDays', label: 'Ngày QH nhiều nhất'  },
  { value: 'invoiceCount',   label: 'Số hóa đơn'          },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function BranchOverdueRates({ data }) {
  const maxOverdueAmount = Math.max(...data.map(b => b.overdueAmount), 1)
  return (
    <ChartCard title="Tỷ lệ Quá hạn theo Chi Nhánh">
      <div className="space-y-4">
        {data.map(branch => {
          const overdueRate = branch.totalAmount > 0
            ? (branch.overdueAmount / branch.totalAmount * 100)
            : 0
          const barWidth = branch.overdueAmount > 0
            ? Math.max(branch.overdueAmount / maxOverdueAmount * 100, 1)
            : 0
          return (
            <div key={branch.branch}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{branch.branch}</span>
                <span className="text-gray-500">{formatCurrency(branch.totalAmount)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-red-500 transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Quá hạn: {formatCurrency(branch.overdueAmount)}</span>
                <span title="% quá hạn trên tổng công nợ của chính chi nhánh này">
                  Tỷ lệ QH: {overdueRate.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

function YearBranchStackedChart({ data, branches }) {
  return (
    <ChartCard title="Công Nợ theo Năm & Chi Nhánh">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          {branches.map((branchName, index) => (
            <Bar
              key={branchName}
              dataKey={branchName}
              stackId="a"
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              radius={index === branches.length - 1 ? [4,4,0,0] : [0,0,0,0]}
              minPointSize={2}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function AgingDetailTable({ buckets }) {
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
  return (
    <ChartCard title="Bảng Chi Tiết Tuổi Nợ">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nhóm tuổi nợ</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">Số giao dịch</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">Tỷ lệ</th>
              <th className="text-right py-2 text-gray-500 font-medium">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map(bucket => (
              <tr key={bucket.bucket} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: BUCKET_COLORS[bucket.bucket] }}
                    />
                    <span className="font-medium text-gray-700">{bucket.bucket}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-right text-gray-600">{bucket.count.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-right text-gray-500">
                  {totalCount > 0 ? ((bucket.count / totalCount) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2.5 text-right font-semibold text-gray-800">{formatCurrency(bucket.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DebtAnalysis() {
  const [topNLimit,   setTopNLimit]   = useState('10')
  const [sortByField, setSortByField] = useState('totalAmount')

  const byBranch     = getDebtByBranch()
  const agingBuckets = getAgingBuckets()
  const { data: yearData, branches } = getDebtByYearAndBranch()

  const topCustomers = useMemo(
    () => getTopCustomers(Number(topNLimit), sortByField),
    [topNLimit, sortByField]
  )
  const { sortedData: sortedCustomers, sortField, sortDirection, handleSortChange } =
    useTableSort(topCustomers, sortByField)

  const hasActiveFilters = topNLimit !== '10' || sortByField !== 'totalAmount'
  function handleFilterReset() { setTopNLimit('10'); setSortByField('totalAmount') }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Phân tích Công Nợ"
        subtitle="Theo chi nhánh, năm và khách hàng"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BranchOverdueRates data={byBranch} />
        <YearBranchStackedChart data={yearData} branches={branches} />
      </div>

      <AgingDetailTable buckets={agingBuckets} />

      <ChartCard
        title="Top Khách Hàng Nợ Nhiều Nhất"
        action={
          <FilterBar hasActiveFilters={hasActiveFilters} onReset={handleFilterReset}>
            <SelectFilter value={topNLimit}   onChange={setTopNLimit}   options={TOP_N_OPTIONS}   placeholder="Số lượng" />
            <SelectFilter value={sortByField} onChange={setSortByField} options={SORT_BY_OPTIONS} placeholder="Sắp xếp theo" />
          </FilterBar>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <SortableHeader label="Khách hàng"  field="name"           sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Chi nhánh"   field="branchName"     sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} />
                <SortableHeader label="Tổng CN"     field="totalAmount"    sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Quá hạn"     field="overdueAmount"  sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <SortableHeader label="Ngày QH max" field="maxOverdueDays" sortField={sortField} sortDirection={sortDirection} onSort={handleSortChange} align="right" />
                <th className="px-4 py-3 text-center text-gray-500 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map(customer => (
                <tr key={customer.code} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800 text-sm leading-tight">{customer.name}</p>
                    <p className="text-xs text-gray-400">{customer.code}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{customer.branchName}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{formatCurrency(customer.totalAmount)}</td>
                  <td className="px-4 py-2.5 text-right text-red-600 font-medium">{formatCurrency(customer.overdueAmount)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {customer.maxOverdueDays > 0 ? `${customer.maxOverdueDays} ngày` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge overdueDays={customer.maxOverdueDays} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
