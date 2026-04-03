import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WeatherPanel from '../components/WeatherPanel'
import { predictYield, explainPrediction } from '../api/cropshield'

const CROPS = [
  'Rice','Wheat','Maize','Cotton','Sugarcane','Jute','Coffee','Coconut',
  'Papaya','Orange','Apple','Muskmelon','Watermelon','Grapes','Mango',
  'Banana','Pomegranate','Lentil','Blackgram','Mungbean','Mothbeans',
  'Pigeonpeas','Kidneybeans','Chickpea'
]

const SOIL_TYPES = ['Alluvial','Loamy','Sandy','Black (Regur)','Red Laterite','Clayey']

const FIELD_DEFS = [
  { key: 'N',           label: 'Nitrogen (N)',       min: 0,   max: 140, step: 1,   unit: 'kg/ha' },
  { key: 'P',           label: 'Phosphorus (P)',     min: 5,   max: 145, step: 1,   unit: 'kg/ha' },
  { key: 'K',           label: 'Potassium (K)',       min: 5,   max: 205, step: 1,   unit: 'kg/ha' },
  { key: 'temperature', label: 'Temperature',         min: 8,   max: 44,  step: 0.1, unit: '°C' },
  { key: 'humidity',    label: 'Humidity',            min: 14,  max: 100, step: 1,   unit: '%' },
  { key: 'ph',          label: 'Soil pH',             min: 3.5, max: 10,  step: 0.1, unit: '' },
  { key: 'rainfall',    label: 'Rainfall',            min: 20,  max: 299, step: 1,   unit: 'mm' },
]

const DEFAULTS = { N: 80, P: 40, K: 40, temperature: 25, humidity: 70, ph: 6.5, rainfall: 120 }

export default function PredictPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULTS)
  const [crop, setCrop] = useState('Rice')
  const [soilType, setSoilType] = useState('Alluvial')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(key, val) {
    setForm(f => ({ ...f, [key]: parseFloat(val) }))
  }

  function handleWeatherLoaded(w) {
    setForm(f => ({
      ...f,
      temperature: w.temperature,
      humidity: w.humidity,
      rainfall: Math.max(20, Math.min(299, Math.round((w.rainfall_3h_mm || 0) * 30 + 60))),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const payload = { crop, soil_type: soilType, ...form }
      const [prediction, explanation] = await Promise.all([
        predictYield(payload),
        explainPrediction(form).catch(() => null),
      ])
      navigate('/results', { state: { prediction, explanation, inputs: payload } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 bg-[#FAFDFB]">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-12">
          <h1 className="text-4xl font-display font-bold text-havens-blue mb-3">🌱 Crop Yield Prediction</h1>
          <p className="text-havens-blue/70 text-lg">Enter your soil and climate parameters to get an AI-powered yield estimate.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <form className="lg:col-span-2 flex flex-col gap-8" onSubmit={handleSubmit}>
            {/* Field Set 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-havens-mint">
              <h2 className="text-2xl font-display font-bold text-havens-blue mb-6">Crop & Soil</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Crop Type</label>
                  <select className="form-input bg-white cursor-pointer" value={crop} onChange={e => setCrop(e.target.value)}>
                    {CROPS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Soil Type</label>
                  <select className="form-input bg-white cursor-pointer" value={soilType} onChange={e => setSoilType(e.target.value)}>
                    {SOIL_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Field Set 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-havens-mint">
              <h2 className="text-2xl font-display font-bold text-havens-blue mb-8">Soil Nutrients & Climate</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {FIELD_DEFS.map(fd => (
                  <div key={fd.key}>
                    <div className="flex justify-between items-end mb-3">
                      <label className="form-label mb-0">{fd.label} <span className="font-normal text-havens-blue/50">({fd.unit})</span></label>
                      <span className="text-havens-green font-bold text-lg">{form[fd.key]}</span>
                    </div>
                    <input
                      type="range"
                      min={fd.min} max={fd.max} step={fd.step}
                      value={form[fd.key]}
                      onChange={e => handleChange(fd.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-bold">
                ⚠ {error}
              </div>
            )}

            <button type="submit" className="btn btn-yellow w-full text-lg py-4 shadow-md" disabled={loading}>
              {loading ? 'Analyzing...' : '🔮 Generate AI Prediction'}
            </button>
          </form>

          {/* Sidebar */}
          <div className="flex flex-col gap-8">
            <WeatherPanel onWeatherLoaded={handleWeatherLoaded} />
            
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-havens-mint">
              <h3 className="text-xl font-display font-bold text-havens-blue mb-6">📋 Current Inputs</h3>
              <div className="flex flex-col gap-3">
                {Object.entries(form).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center pb-2 border-b border-havens-mint last:border-0 last:pb-0">
                    <span className="text-sm font-bold text-havens-blue-light">{k}</span>
                    <span className="font-bold text-havens-green">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
