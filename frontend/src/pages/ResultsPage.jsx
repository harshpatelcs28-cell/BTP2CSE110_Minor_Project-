import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import MetricCard from '../components/MetricCard'
import ShapChart from '../components/ShapChart'
import { optimizeResources } from '../api/cropshield'

export default function ResultsPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [optData, setOptData] = useState(null)
  const [optLoading, setOptLoading] = useState(false)

  if (!state?.prediction) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-6 text-center text-havens-blue">
        <div className="text-5xl mb-4">🌾</div>
        <h2 className="text-3xl font-display font-bold mb-6">No prediction found</h2>
        <Link to="/predict" className="btn btn-yellow">Go to Predictor</Link>
      </div>
    )
  }

  const { prediction: p, explanation: ex, inputs } = state
  const confidence = p.confidence || 75
  const confColor = confidence >= 85 ? 'text-green-600 bg-green-100' : confidence >= 65 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'

  async function loadOptimization() {
    setOptLoading(true)
    try {
      const opt = await optimizeResources({
        crop: inputs.crop, N: inputs.N, P: inputs.P, K: inputs.K,
        rainfall: inputs.rainfall, soil_type: inputs.soil_type,
      })
      setOptData(opt)
    } catch (e) {
      console.error(e)
    } finally {
      setOptLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 bg-[#FAFDFB]">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-havens-blue">Prediction Results</h1>
            <p className="text-havens-blue/60 font-semibold">{inputs.crop} • {inputs.soil_type} soil</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/predict')}>
            ← New Prediction
          </button>
        </div>

        {/* Hero Result */}
        <div className="bg-gradient-to-br from-[#E6F5EE] to-white rounded-[2rem] p-10 text-center shadow-sm border border-havens-mint mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 border border-havens-green/20 text-havens-green bg-white">
            Model: {p.model_used?.replace('_', ' ')}
          </div>
          <div className="text-6xl md:text-8xl font-display font-bold text-havens-blue tracking-tighter leading-none mb-2">
            {p.predicted_yield}
          </div>
          <div className="text-lg font-bold text-havens-green uppercase tracking-wide">{p.yield_unit}</div>
          
          <div className="flex justify-center items-center gap-8 md:gap-16 mt-12 bg-white rounded-3xl py-6 px-8 mx-auto max-w-2xl shadow-sm border border-havens-mint">
            <div>
              <div className="text-xs font-bold text-havens-blue/40 uppercase mb-1">Min Yield</div>
              <div className="text-xl font-bold text-havens-blue">{p.yield_range?.min}</div>
            </div>
            <div className="px-8 border-x border-havens-mint">
              <div className="text-xs font-bold text-havens-blue/40 uppercase mb-1">Confidence</div>
              <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${confColor}`}>{confidence}%</div>
            </div>
            <div>
              <div className="text-xs font-bold text-havens-blue/40 uppercase mb-1">Max Yield</div>
              <div className="text-xl font-bold text-havens-blue">{p.yield_range?.max}</div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <MetricCard icon="🌡️" label="Temperature"  value={`${inputs.temperature}°C`}   color="amber" />
          <MetricCard icon="💧" label="Humidity"      value={`${inputs.humidity}%`}        color="blue"  />
          <MetricCard icon="🌧️" label="Rainfall"      value={`${inputs.rainfall} mm`}      color="blue"  />
          <MetricCard icon="⚗️" label="Soil pH"       value={inputs.ph}                    color="lime"  />
          <MetricCard icon="🧪" label="Nitrogen"      value={`${inputs.N} kg/ha`}          color="green" />
          <MetricCard icon="🔬" label="Phosphorus"    value={`${inputs.P} kg/ha`}          color="lime"  />
        </div>

        {ex?.shap_values && (
          <div className="bg-white rounded-3xl p-8 border border-havens-mint shadow-sm mb-8">
            <ShapChart shapValues={ex.shap_values} />
          </div>
        )}

        {/* Resources */}
        <div className="bg-white rounded-3xl p-8 border border-havens-mint shadow-sm mb-8">
          <h2 className="text-2xl font-display font-bold text-havens-blue mb-6">💧 Resource Optimization</h2>
          {!optData && !optLoading && (
            <div className="text-center py-6">
              <p className="text-havens-blue/60 font-medium mb-6">Get precision irrigation and fertilizer recommendations for your field.</p>
              <button className="btn btn-yellow" onClick={loadOptimization}>Generate Recommendations</button>
            </div>
          )}
          {optLoading && <div className="text-center py-6 text-havens-green font-bold animate-pulse">Running AI Optmization...</div>}
          
          {optData && (
             <div className="space-y-8 animate-fade-in">
             {/* Water */}
             <div>
               <h3 className="text-lg font-bold text-havens-blue mb-4">Water Requirement</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-havens-mint-light p-5 rounded-2xl">
                   <div className="text-xs font-bold text-havens-blue/50 uppercase mb-1">Weekly Base</div>
                   <div className="text-xl font-bold text-havens-blue">{optData.water?.weekly_crop_requirement_mm} mm</div>
                 </div>
                 <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                   <div className="text-xs font-bold text-blue-800/50 uppercase mb-1">Irrigation Needed</div>
                   <div className={`text-2xl font-bold ${optData.water?.status === 'Sufficient' ? 'text-green-600' : 'text-blue-600'}`}>
                     {optData.water?.irrigation_required_mm_week} mm/wk
                   </div>
                   <div className="text-sm font-medium text-blue-800/70 mt-1">{optData.water?.method}</div>
                 </div>
               </div>
             </div>
 
             {/* Fertilizers */}
             <div>
               <h3 className="text-lg font-bold text-havens-blue mb-4">Fertilizer Prescription</h3>
               <div className="space-y-2">
                 {optData.fertilizers?.map((f, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                     <div>
                       <span className="font-bold text-havens-blue">{f.nutrient}</span>
                       <span className="text-havens-blue/50 ml-2 font-medium">{f.fertilizer}</span>
                     </div>
                     <div>
                       {f.application_kg_ha > 0
                         ? <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-sm font-bold">{f.application_kg_ha} kg/ha</span>
                         : <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-bold">Adequate</span>
                       }
                     </div>
                   </div>
                 ))}
               </div>
             </div>
 
             {/* Cost */}
             <div className="bg-havens-green text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
               <div>
                  <div className="text-white/80 font-bold text-sm uppercase">Total Estimated Cost</div>
                  <div className="text-sm">Fertilizer ₹{optData.estimated_cost_inr?.fertilizer_inr_per_ha} + Irrigation ₹{optData.estimated_cost_inr?.irrigation_inr_per_ha}</div>
               </div>
               <div className="text-3xl font-display font-bold">
                 ₹{optData.estimated_cost_inr?.total_inr_per_ha?.toLocaleString('en-IN')} / ha
               </div>
             </div>
           </div>
          )}
        </div>

        <div className="flex gap-4">
          <Link to="/dashboard" className="btn btn-yellow flex-1 text-center font-bold shadow-md">Go To Dashboard →</Link>
        </div>
      </div>
    </div>
  )
}
