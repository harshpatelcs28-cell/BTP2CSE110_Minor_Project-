const BASE_URL = 'http://localhost:5000'

async function request(method, path, body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}${path}`, options)
  const json = await res.json()
  if (!res.ok || json.status === 'error') throw new Error(json.message || `HTTP ${res.status}`)
  return json.data
}

export const predictYield     = (payload) => request('POST', '/predict', payload)
export const explainPrediction = (features) => request('POST', '/explain', features)
export const fetchWeather     = ({ city, lat, lon } = {}) => {
  const qs = city ? `?city=${encodeURIComponent(city)}` : `?lat=${lat}&lon=${lon}`
  return request('GET', `/weather${qs}`)
}
export const optimizeResources = (payload) => request('POST', '/optimize', payload)
export const fetchHistory      = (limit = 20) => request('GET', `/history?limit=${limit}`)
export const healthCheck       = () => request('GET', '/health')
