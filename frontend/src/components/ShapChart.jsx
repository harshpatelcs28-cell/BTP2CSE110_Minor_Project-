export default function ShapChart({ shapValues = [] }) {
  if (!shapValues.length) return null
  const max = Math.max(...shapValues.map(s => s.shap_value), 0.001)

  return (
    <div>
      <h3 className="text-xl font-bold font-display text-havens-blue mb-4">Feature Importance (SHAP)</h3>
      <div className="space-y-3">
        {shapValues.map((s, i) => (
          <div className="flex items-center gap-3" key={i}>
            <span className="w-24 text-right text-sm font-bold text-havens-blue-light flex-shrink-0">{s.label || s.feature}</span>
            <div className="flex-1 h-3 bg-havens-mint rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-havens-green to-havens-yellow"
                style={{ width: `${(s.shap_value / max) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs font-bold text-havens-blue/60 flex-shrink-0">{(s.normalized_importance * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
