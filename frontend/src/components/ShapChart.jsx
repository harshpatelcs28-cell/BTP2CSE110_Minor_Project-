import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

// Color by SHAP direction
const barColor = (dir) =>
  dir === 'positive' ? '#4ade80' : dir === 'negative' ? '#f87171' : '#60a5fa';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#163a50] text-white rounded-2xl shadow-xl p-4 min-w-[220px] text-sm">
      <p className="font-black text-[#fbc943] mb-1">{d.label || d.feature}</p>
      <p className="font-bold">
        SHAP: <span style={{ color: barColor(d.direction) }}>
          {d.shap_value > 0 ? '+' : ''}{d.shap_value?.toFixed(4)}
        </span>
      </p>
      <p className="font-bold mt-1">Your input: <span className="text-white">{d.input_value}</span></p>
      {d.effect_description && (
        <p className="text-xs text-white/70 mt-2 leading-relaxed">{d.effect_description}</p>
      )}
    </div>
  );
};

/**
 * ShapChart — shows per-prediction SHAP values on the Results page.
 * Positive bars (green) = features pushing toward the predicted crop.
 * Negative bars (red)   = features working against the prediction.
 *
 * Props:
 *   shapValues  — array from /ml/explain or prediction.explanation.shap_values
 *   title       — optional header string
 */
export default function ShapChart({ shapValues = [], title = 'Feature Impact (SHAP)' }) {
  if (!shapValues.length) return null;

  // Show only base features (first 7) on Results page — less cluttered
  const BASE_FEATS = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'];
  const display = shapValues
    .filter(s => BASE_FEATS.includes(s.feature))
    .map(s => ({
      ...s,
      pct: parseFloat(((s.normalized_importance ?? s.abs_shap ?? 0) * 100).toFixed(1)),
      // If shap_value is unsigned (heuristic fallback), keep sign as-is
      shap_value_display:
        typeof s.shap_value === 'number'
          ? parseFloat(s.shap_value.toFixed(4))
          : 0,
      direction: s.direction || (s.shap_value >= 0 ? 'positive' : 'negative'),
    }));

  // Sort by absolute SHAP descending
  display.sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));

  const method = shapValues[0]?.method || shapValues.method || '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold font-display text-havens-blue">{title}</h3>
        {method && (
          <span className="text-xs font-black px-3 py-1 rounded-full bg-havens-mint text-havens-green uppercase tracking-wider">
            {method.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Direction legend */}
      <div className="flex gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-green-400" />
          Positive influence
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          Limiting factor
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
          <div className="w-3 h-3 rounded-sm bg-blue-400" />
          Neutral
        </div>
      </div>

      {/* Recharts horizontal bar chart */}
      <div style={{ height: `${Math.max(display.length * 44, 220)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={display}
            layout="vertical"
            margin={{ top: 0, right: 50, left: 10, bottom: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis
              type="number"
              tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 700 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={100}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#163a50', fontSize: 12, fontWeight: 700 }}
            />
            <ReferenceLine x={0} stroke="#e5e7eb" strokeWidth={2} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="shap_value_display" name="SHAP Value" radius={[0, 5, 5, 0]}>
              {display.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.direction)} opacity={0.82} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Percentage contribution summary */}
      <div className="mt-6 space-y-2">
        <p className="text-xs font-black text-havens-blue/40 uppercase tracking-wider mb-3">
          Importance Share
        </p>
        {display.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-24 text-right text-xs font-bold text-havens-blue/60 flex-shrink-0 truncate">
              {s.label || s.feature}
            </span>
            <div className="flex-1 h-2 bg-havens-mint rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${s.pct}%`,
                  background: barColor(s.direction),
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="w-10 text-right text-xs font-bold flex-shrink-0"
              style={{ color: barColor(s.direction) }}>
              {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
