const BASE_URL    = 'http://localhost:5000'
const ML_BASE_URL = 'http://localhost:5001'

async function request(method, path, body = null, base = BASE_URL) {
  const options = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) options.body = JSON.stringify(body)
  const res  = await fetch(`${base}${path}`, options)
  const json = await res.json()
  if (!res.ok || json.status === 'error') throw new Error(json.message || `HTTP ${res.status}`)
  return json.data
}

export const predictYield      = (payload)           => request('POST', '/predict',    payload)
export const explainPrediction = (features)          => request('POST', '/explain',    features)
export const optimizeResources = (payload)           => request('POST', '/optimize',   payload)
export const fetchHistory      = (limit = 20)        => request('GET',  `/history?limit=${limit}`)
export const healthCheck       = ()                  => request('GET',  '/health')
export const fetchWeather      = ({ city, lat, lon } = {}) => {
  const qs = city ? `?city=${encodeURIComponent(city)}` : `?lat=${lat}&lon=${lon}`
  return request('GET', `/weather${qs}`)
}

/**
 * Fetch global feature importances from the ML engine.
 * Returns: { features[], model_used, method, n_features }
 * Falls back to Node backend proxy if ML service is on a different origin.
 */
export const fetchFeatureImpact = async () => {
  try {
    return await request('GET', '/ml/feature-impact', null, ML_BASE_URL)
  } catch {
    // Fallback: try via Node backend proxy
    return await request('GET', '/api/feature-impact', null, BASE_URL)
  }
}
