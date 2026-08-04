import {
  getKpis, getDebtByBranch, getDebtByNhomLoaiHinh, getAgingBuckets, getDebtByYear,
  formatCurrency, CHART_COLORS, BUCKET_COLORS,
} from '../services/dataService'
import { formatAxisValue, CHART_MARGIN, CHART_MARGIN_LARGE, GRID_STROKE, GRID_DASH } from '../utils/chartUtils'
import KPICard          from '../components/KPICard'
import ChartCard        from '../components/ChartCard'
import ChartTooltip     from '../components/ChartTooltip'
import PageHeader       from '../components/PageHeader'
import { NhomLoaiHinhBadge } from '../components/NhomBadge'
import AttachMoneyIcon   from '@mui/icons-material/AttachMoney'
import AccessTimeIcon    from '@mui/icons-material/AccessTime'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import WarningAmberIcon  from '@mui/icons-material/WarningAmber'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiGrid({ kpis }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <KPICard title="Tổng công nợ phải thu" value={formatCurrency(kpis.totalAmount)}  subLabel={`${kpis.totalRecords.toLocaleString()} giao dịch`}  icon={AttachMoneyIcon}   color="blue"   />
      <KPICard title="Công nợ quá hạn"        value={formatCurrency(kpis.overdueAmount)} subLabel={`Tỷ lệ: ${kpis.overdueRate.toFixed(1)}%`}             icon={AccessTimeIcon}    color="red"    />
      <KPICard title="Số khách hàng"           value={kpis.customerCount.toLocaleString()} subLabel="Có công nợ phải thu"                                  icon={LocalHospitalIcon} color="green"  />
      <KPICard title="Công nợ Loại 2"          value={`${kpis.loai2Count} HĐ`}           subLabel="Rủi ro cao cần xử lý"                                 icon={WarningAmberIcon}  color="orange" />
    </div>
  )
}

function BranchBarChart({ data }) {
  return (
    <ChartCard title="Công Nợ theo Chi Nhánh">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
          <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar dataKey="totalAmount"   name="Tổng CN" fill="#3b82f6" radius={[4,4,0,0]} minPointSize={2} />
          <Bar dataKey="overdueAmount" name="Quá hạn" fill="#ef4444" radius={[4,4,0,0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function NhomPieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <ChartCard title="Phân bổ Nhóm Loại Hình">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="55%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
              <div className="min-w-0">
                <div className="text-xs font-medium">
                  <NhomLoaiHinhBadge value={item.name} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{item.count} HĐ · {formatCurrency(item.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

function AgingChart({ buckets }) {
  return (
    <ChartCard title="Cơ cấu Công Nợ theo Mức Độ Quá Hạn">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={buckets} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="amount" name="Số tiền" radius={[4,4,0,0]} minPointSize={2}>
            {buckets.map(entry => (
              <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
        {buckets.map(bucket => (
          <div key={bucket.bucket} className="text-center">
            <p className="text-xs text-gray-500">{bucket.bucket}</p>
            <p className="text-sm font-bold text-gray-800">{bucket.count}</p>
            <p className="text-xs text-gray-400">giao dịch</p>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

function YearTrendChart({ data }) {
  return (
    <ChartCard title="Xu hướng Công Nợ theo Năm">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={CHART_MARGIN_LARGE}>
          <CartesianGrid strokeDasharray={GRID_DASH} stroke={GRID_STROKE} />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="totalAmount"   name="Tổng CN" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="overdueAmount" name="Quá hạn" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Overview() {
  const kpis         = getKpis()
  const byBranch     = getDebtByBranch()
  const byNhom       = getDebtByNhomLoaiHinh()
  const agingBuckets = getAgingBuckets()
  const byYear       = getDebtByYear()

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tổng quan Công Nợ"
        subtitle={`Tổng hợp từ ${kpis.totalRecords.toLocaleString()} giao dịch`}
      />
      <KpiGrid kpis={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BranchBarChart data={byBranch} />
        <NhomPieChart   data={byNhom} />
      </div>
      <AgingChart    buckets={agingBuckets} />
      <YearTrendChart data={byYear} />
    </div>
  )
}
