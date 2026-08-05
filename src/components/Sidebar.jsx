import { NavLink } from 'react-router-dom'
import ytecoLogo from '../assets/yteco.jpg'
import DashboardIcon      from '@mui/icons-material/Dashboard'
import BarChartIcon       from '@mui/icons-material/BarChart'
import PeopleAltIcon      from '@mui/icons-material/PeopleAlt'
import CategoryIcon       from '@mui/icons-material/Category'
import WarningAmberIcon   from '@mui/icons-material/WarningAmber'
import MenuOpenIcon       from '@mui/icons-material/MenuOpen'
import MenuIcon           from '@mui/icons-material/Menu'
import AssessmentIcon     from '@mui/icons-material/Assessment'

const NAV_ITEMS = [
  { to: '/',                Icon: DashboardIcon,    label: 'Tổng quan'              },
  { to: '/debt-analysis',   Icon: BarChartIcon,     label: 'Phân tích Công Nợ'      },
  { to: '/customers',       Icon: PeopleAltIcon,    label: 'Danh sách Khách Hàng'   },
  { to: '/business-type',   Icon: CategoryIcon,     label: 'Loại Hình Kinh Doanh'   },
  { to: '/debt-classification', Icon: WarningAmberIcon, label: 'Phân Loại Công Nợ' },
  { to: '/congno-report',   Icon: AssessmentIcon,   label: 'TL Công Nợ Quá Hạn'    },
]

export default function Sidebar({ isOpen, onToggle }) {
  return (
    <aside
      className={`h-screen sticky top-0 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 overflow-y-auto ${
        isOpen ? 'w-60' : 'w-14'
      }`}
    >
      {/* Header: logo + toggle button */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-slate-700">
        {isOpen && (
          <img src={ytecoLogo} alt="Yteco" className="h-16 w-auto object-contain" />
        )}
        <button
          onClick={onToggle}
          className={`text-slate-400 hover:text-white transition-colors rounded-lg p-1.5 hover:bg-slate-700 ${
            isOpen ? '' : 'mx-auto'
          }`}
          title={isOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
        >
          {isOpen ? <MenuOpenIcon sx={{ fontSize: 22 }} /> : <MenuIcon sx={{ fontSize: 22 }} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={!isOpen ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                isOpen ? '' : 'justify-center'
              } ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon sx={{ fontSize: 20 }} className="flex-shrink-0" />
            {isOpen && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="px-4 py-4 border-t border-slate-700 text-xs text-slate-500">
          Demo Dashboard
        </div>
      )}
    </aside>
  )
}
