export default function MetricCard({ icon, label, value, sub, color = 'green' }) {
  // We use inline Tailwind classes for colored accents based on the prop
  const colorMap = {
    green: 'bg-green-100 text-green-700',
    lime: 'bg-lime-100 text-lime-700',
    amber: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return (
    <div className="bg-white border rounded-3xl p-6 flex items-start gap-4 shadow-sm hover:shadow-soft transition-all duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${colorMap[color] || colorMap.green}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-havens-blue/50 mb-1">{label}</div>
        <div className="font-display text-2xl font-bold text-havens-blue">{value}</div>
        {sub && <div className="text-sm font-medium text-havens-blue-light mt-1">{sub}</div>}
      </div>
    </div>
  )
}
