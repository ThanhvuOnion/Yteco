const COLOR_VARIANTS = {
  blue:   { bg: 'bg-blue-50',   iconBg: 'bg-blue-500',   text: 'text-blue-600' },
  red:    { bg: 'bg-red-50',    iconBg: 'bg-red-500',    text: 'text-red-600' },
  green:  { bg: 'bg-green-50',  iconBg: 'bg-green-500',  text: 'text-green-600' },
  orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-500', text: 'text-orange-600' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-500', text: 'text-purple-600' },
}

export default function KPICard({ title, value, subLabel, icon: Icon, color = 'blue' }) {
  const variant = COLOR_VARIANTS[color] || COLOR_VARIANTS.blue

  return (
    <div className={`${variant.bg} rounded-2xl p-5 flex items-start gap-4 shadow-sm`}>
      <div className={`${variant.iconBg} text-white rounded-xl p-3 flex-shrink-0 flex items-center justify-center`}>
        {Icon && <Icon sx={{ fontSize: 22 }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className={`text-2xl font-bold ${variant.text} mt-1 truncate`}>{value}</p>
        {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
      </div>
    </div>
  )
}
