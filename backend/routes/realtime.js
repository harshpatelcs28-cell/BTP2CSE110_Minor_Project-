const express = require('express');
const fetch = require('node-fetch');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
const ML_SERVICE = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * GET /api/realtime/weather?lat=28.6&lon=77.2&crop=Rice
 *
 * 1) Fetches live weather from Open-Meteo (free, no API key)
 * 2) Passes readings to Flask ML service for yield prediction
 * 3) Returns combined { weather, prediction, timestamp }
 */
router.get('/weather', verifyToken, async (req, res) => {
    const lat  = parseFloat(req.query.lat  || 20.5937);   // default: central India
    const lon  = parseFloat(req.query.lon  || 78.9629);
    const crop = req.query.crop || 'Rice';

    try {
        // ── Step 1: Fetch live weather from Open-Meteo ──────────────────────
        const meteoUrl = `https://api.open-meteo.com/v1/forecast?` + new URLSearchParams({
            latitude:               lat,
            longitude:              lon,
            current:                'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,surface_pressure',
            hourly:                 'precipitation',
            forecast_days:          1,
            timezone:               'auto',
        });

        const weatherResp = await fetch(meteoUrl, { timeout: 8000 });
        if (!weatherResp.ok) throw new Error(`Open-Meteo error ${weatherResp.status}`);
        const meteo = await weatherResp.json();

        const cur = meteo.current;
        const temperature = parseFloat(cur.temperature_2m     ?? 26);
        const humidity    = parseFloat(cur.relative_humidity_2m ?? 65);
        const rainfall    = parseFloat(cur.precipitation       ?? 0) * 30; // scale mm/h → monthly-ish
        const windSpeed   = parseFloat(cur.wind_speed_10m      ?? 10);
        const pressure    = parseFloat(cur.surface_pressure    ?? 1013);
        const weatherCode = parseInt(cur.weather_code          ?? 0);

        // Map WMO weather codes to description
        const desc = wmoDescription(weatherCode);

        // ── Step 2: Run ML prediction with live weather ──────────────────────
        let prediction = null;
        let mlOnline   = false;
        try {
            const mlBody = {
                crop,
                N:           60,    // neutral nutrient defaults
                P:           45,
                K:           40,
                temperature,
                humidity,
                ph:          6.8,
                rainfall:    Math.max(20, Math.min(299, rainfall || 80)),
            };
            const mlResp = await fetch(`${ML_SERVICE}/ml/predict`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(mlBody),
                timeout: 8000,
            });
            if (mlResp.ok) {
                const mlJson = await mlResp.json();
                prediction  = mlJson.data;
                mlOnline    = true;
            }
        } catch (_) { /* ML offline — omit prediction */ }

        res.json({
            timestamp:   new Date().toISOString(),
            location:    { lat, lon },
            weather: {
                temperature:   Math.round(temperature * 10) / 10,
                humidity:      Math.round(humidity),
                rainfall_mm:   Math.round(rainfall * 10) / 10,
                wind_kmh:      Math.round(windSpeed * 3.6 * 10) / 10,
                pressure_hpa:  Math.round(pressure),
                description:   desc,
                weather_code:  weatherCode,
            },
            prediction:  prediction
                ? {
                    yield:       prediction.predicted_yield,
                    yield_unit:  prediction.yield_unit,
                    yield_range: prediction.yield_range,
                    confidence:  prediction.confidence,
                    model:       prediction.model_used,
                    crop,
                }
                : null,
            ml_online: mlOnline,
        });

    } catch (err) {
        console.error('[realtime] Error:', err.message);
        res.status(502).json({ error: 'Failed to fetch live weather data', detail: err.message });
    }
});

function wmoDescription(code) {
    if (code === 0)               return 'Clear Sky';
    if (code <= 3)                return 'Partly Cloudy';
    if (code <= 9)                return 'Foggy';
    if (code <= 29)               return 'Drizzle';
    if (code <= 39)               return 'Foggy';
    if (code <= 49)               return 'Drizzle';
    if (code <= 59)               return 'Light Rain';
    if (code <= 69)               return 'Rain';
    if (code <= 79)               return 'Snow';
    if (code <= 84)               return 'Rain Showers';
    if (code <= 94)               return 'Thunderstorm';
    return 'Heavy Thunderstorm';
}

module.exports = router;
