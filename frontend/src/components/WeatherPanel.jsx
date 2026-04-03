import { useState } from 'react'
import { fetchWeather } from '../api/cropshield'

export default function WeatherPanel({ onWeatherLoaded }) {
  const [city, setCity] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFetch() {
    if (!city.trim()) return
    setLoading(true); setError('')
    try {
      const w = await fetchWeather({ city: city.trim() })
      setData(w)
      if (onWeatherLoaded) onWeatherLoaded(w)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#E6F5EE] to-[#CBEBD9] border border-[#1B8C48]/20 rounded-3xl p-8 shadow-sm">
      <h3 className="text-2xl font-display font-bold text-havens-blue mb-6 flex items-center gap-2">
        <span>🌤</span> Live Weather
      </h3>
      <div className="flex gap-3 mb-6">
        <input
          className="form-input flex-1"
          placeholder="Enter city name..."
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleFetch()}
        />
        <button
          className="btn btn-yellow px-6"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? '...' : 'Fetch'}
        </button>
      </div>

      {error && <p className="text-red-500 font-bold mb-4">{error}</p>}

      {data && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-xl font-display font-bold text-havens-blue">{data.city}{data.country ? `, ${data.country}` : ''}</div>
              <div className="text-havens-blue-light font-medium">{data.description}</div>
            </div>
            <div className="text-4xl font-display font-bold text-havens-blue">{data.temperature}°</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <div className="font-bold text-havens-blue">{data.humidity}%</div>
              <div className="text-xs font-bold text-havens-blue/60 uppercase">Humidity</div>
            </div>
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <div className="font-bold text-havens-blue">{data.wind_speed_kmh} km/h</div>
              <div className="text-xs font-bold text-havens-blue/60 uppercase">Wind</div>
            </div>
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <div className="font-bold text-havens-blue">{data.rainfall_3h_mm} mm</div>
              <div className="text-xs font-bold text-havens-blue/60 uppercase">Rain (3h)</div>
            </div>
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <div className="font-bold text-havens-blue">{data.pressure_hpa} hPa</div>
              <div className="text-xs font-bold text-havens-blue/60 uppercase">Pressure</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
