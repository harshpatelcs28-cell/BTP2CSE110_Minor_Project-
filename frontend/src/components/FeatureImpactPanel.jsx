import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

// ── Color map ─────────────────────────────────────────────────────────────────
const DIR_COLORS = {
  positive: '#4ade80',   // green-400
  negative: '#f87171',   // red-400
  neutral:  '#60a5fa',   // blue-400
};

const DIR_BG = {
  positive: 'bg-green-50 border-green-200',
  negative: 'bg-red-50 border-red-200',
  neutral:  'bg-blue-50 border-blue-200',
};

const DIR_TEXT = {
  positive: 'text-green-700',
  negative: 'text-red-700',
  neutral:  'text-blue-700',
};

const DIR_BADGE = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-800',
  neutral:  'bg-blue-100 text-blue-700',
};

const DIR_ICON = {
  positive: '↑',
  negative: '↓',
  neutral:  '→',
};

// ── Custom tooltip for bar chart ──────────────────────────────────────────────
const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#163a50] text-white rounded-2xl shadow-xl p-4 min-w-[200px] text-sm">
      <p className="font-black text-[#fbc943] mb-1">{d.label}</p>
      <p className="font-bold">Importance: <span className="text-white">{d.pct?.toFixed(1)}%</span></p>
      <p className={`text-xs mt-2 font-medium ${
        d.direction === 'positive' ? 'text-green-300' :
        d.direction === 'negative' ? 'text-red-300' : 'text-blue-300'
      }`}>
        {DIR_ICON[d.direction]} {d.effect_description}
      </p>
    </div>
  );
};

// ── Custom tooltip for pie chart ──────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#163a50] text-white rounded-2xl shadow-xl p-3 text-sm">
      <p className="font-black text-[#fbc943]">{d.name}</p>
      <p className="font-bold">{d.value?.toFixed(1)}%</p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const FeatureImpactPanel = ({ features = [], modelUsed = '', loading = false, error = '' }) => {
  const [activeTab, setActiveTab] = useState('bar'); // 'bar' | 'pie' | 'cards'

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#8fb13d] border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-[#163a50]/60">Computing feature importances…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[2.5rem] p-8 text-red-600 font-bold text-sm">
        ⚠ {error}
      </div>
    );
  }

  if (!features.length) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 text-center text-gray-400 font-bold">
        No feature data available. Train a model first.
      </div>
    );
  }

  // Recharts needs numeric values — ensure pct is a float
  const barData = features.map(f => ({
    ...f,
    pct: parseFloat((f.pct || f.importance * 100 || 0).toFixed(2)),
  }));

  const pieData = barData.map(f => ({
    name:  f.label,
    value: f.pct,
    direction: f.direction,
    fill:  DIR_COLORS[f.direction] || '#8fb13d',
  }));

  // Split features into base (user-visible) and engineered for card section
  const BASE_FEATS  = ['N','P','K','temperature','humidity','ph','rainfall'];
  const baseFeats   = barData.filter(f => BASE_FEATS.includes(f.feature));
  const engFeats    = barData.filter(f => !BASE_FEATS.includes(f.feature));

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      {/* ── Header ── */}
      <div className="p-8 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-[#163a50]">
              🧬 Feature Impact Analysis
            </h2>
            <p className="text-gray-400 text-sm mt-1 font-medium">
              How each input factor influences crop yield prediction
              {modelUsed && <span className="ml-2 text-[#8fb13d] font-bold">· {modelUsed.replace(/_/g, ' ').toUpperCase()}</span>}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'bar',   label: '▊ Bar' },
              { id: 'pie',   label: '◉ Pie' },
              { id: 'cards', label: '✦ Cards' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#163a50] text-[#fbc943] shadow-sm'
                    : 'text-gray-500 hover:text-[#163a50]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { dir: 'positive', label: 'Positive influence on yield' },
            { dir: 'negative', label: 'Negative / limiting factor' },
            { dir: 'neutral',  label: 'Contextual / interaction' },
          ].map(l => (
            <div key={l.dir} className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
              <div className="w-3 h-3 rounded-full" style={{ background: DIR_COLORS[l.dir] }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bar Chart ─────────────────────────────────────────────────────── */}
      {activeTab === 'bar' && (
        <div className="p-8">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-6">
            Feature Importance Ranking (% of total model influence)
          </p>
          <div style={{ height: `${Math.max(barData.length * 40, 320)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 20, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis
                  type="number"
                  domain={[0, 'dataMax']}
                  tickFormatter={v => `${v.toFixed(0)}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={130}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#163a50', fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="pct" name="Importance %" radius={[0, 6, 6, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={DIR_COLORS[entry.direction] || '#8fb13d'}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Pie Chart ─────────────────────────────────────────────────────── */}
      {activeTab === 'pie' && (
        <div className="p-8">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-6">
            Relative Contribution (% of total model influence)
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, value }) => `${name.split(' ')[0]}: ${value.toFixed(1)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 16 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Explanation Cards ─────────────────────────────────────────────── */}
      {activeTab === 'cards' && (
        <div className="p-8 space-y-6">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
              Soil &amp; Climate Factors
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {baseFeats.map((f, i) => (
                <FeatureCard key={i} feature={f} rank={barData.indexOf(f) + 1} />
              ))}
            </div>
          </div>
          {engFeats.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
                Interaction Features (engineered by ML engine)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {engFeats.map((f, i) => (
                  <FeatureCard key={i} feature={f} rank={barData.indexOf(f) + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ── Feature explanation card ──────────────────────────────────────────────────
const FeatureCard = ({ feature: f, rank }) => {
  const dir = f.direction || 'neutral';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${DIR_BG[dir]} transition-all hover:shadow-sm`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
        ${dir === 'positive' ? 'bg-green-200 text-green-800' :
          dir === 'negative' ? 'bg-red-200 text-red-800' :
                               'bg-blue-200 text-blue-800'}`}>
        {DIR_ICON[dir]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-black truncate ${DIR_TEXT[dir]}`}>
            {f.label}
          </p>
          <span className={`text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 ${DIR_BADGE[dir]}`}>
            #{rank} · {f.pct?.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">
          {f.effect_description}
        </p>
        {/* Mini importance bar */}
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(f.pct * 3, 100).toFixed(0)}%`,
              background: DIR_COLORS[dir],
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FeatureImpactPanel;
