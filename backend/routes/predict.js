const express = require('express');
const fetch   = require('node-fetch');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../database');

const router     = express.Router();
const ML_SERVICE = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// ── Helper: proxy POST to ML service ─────────────────────────────────────────
async function callML(endpoint, body) {
    const resp = await fetch(`${ML_SERVICE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: 10000,
    });
    if (!resp.ok) throw new Error(`ML service error: ${resp.status}`);
    const json = await resp.json();
    return json.data;
}

// ── Helper: proxy GET to ML service ──────────────────────────────────────────
async function callMLGet(endpoint) {
    const resp = await fetch(`${ML_SERVICE}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000,
    });
    if (!resp.ok) throw new Error(`ML service error: ${resp.status}`);
    const json = await resp.json();
    return json.data;
}

// ── Rule-based fallback when ML service is down ───────────────────────────────
function ruleBasedFallback(cropType) {
    const yields = {
        Wheat: { base: 3.8, unit: 'tonnes/ha' },
        Corn:  { base: 5.2, unit: 'tonnes/ha' },
        Rice:  { base: 4.5, unit: 'tonnes/ha' },
        Soybeans: { base: 2.8, unit: 'tonnes/ha' },
    };
    const info     = yields[cropType] || { base: 3.5, unit: 'tonnes/ha' };
    const variance = (Math.random() - 0.5) * 0.6;
    const yieldVal = +(info.base + variance).toFixed(2);
    return {
        prediction:      `${yieldVal} ${info.unit}`,
        confidence:      Math.floor(68 + Math.random() * 20),
        model_used:      'rule_based_fallback',
        predicted_yield: yieldVal,
        yield_unit:      info.unit,
    };
}

// ── POST /api/predict — main yield prediction ─────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
    const { cropType, location, soilType, N, P, K, temperature, humidity, ph, rainfall } = req.body;
    if (!cropType) return res.status(400).json({ error: 'cropType is required' });

    const features = {
        crop:        cropType,
        N:           parseFloat(N           ?? 60),
        P:           parseFloat(P           ?? 45),
        K:           parseFloat(K           ?? 40),
        temperature: parseFloat(temperature  ?? 25),
        humidity:    parseFloat(humidity     ?? 65),
        ph:          parseFloat(ph           ?? 6.8),
        rainfall:    parseFloat(rainfall     ?? 80),
        soil_type:   soilType || 'Alluvial',
    };

    let result;
    let mlOnline = false;

    try {
        result   = await callML('/ml/predict', features);
        mlOnline = true;
    } catch (mlErr) {
        console.warn('[predict] ML service unavailable, using fallback:', mlErr.message);
        result = ruleBasedFallback(cropType);
    }

    // Persist to database
    db.run(
        `INSERT INTO predictions (userId, cropType, location, soilType, date, yieldPrediction)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            req.userId,
            cropType,
            location || '',
            soilType || '',
            new Date().toISOString(),
            mlOnline
                ? `${result.predicted_yield} ${result.yield_unit}`
                : result.prediction,
        ],
        (err) => { if (err) console.error('[predict] DB error:', err.message); }
    );

    res.json({
        prediction:      mlOnline ? `${result.predicted_yield} ${result.yield_unit}` : result.prediction,
        confidence:      result.confidence,
        model_used:      result.model_used,
        predicted_yield: result.predicted_yield,
        yield_unit:      result.yield_unit,
        yield_range:     result.yield_range,
        explanation:     result.explanation || null,
        ml_online:       mlOnline,
    });
});


// ── GET /api/feature-impact — proxy to ML service (no auth needed for charts) ─
router.get('/feature-impact', async (req, res) => {
    try {
        const data = await callMLGet('/ml/feature-impact');
        res.json({ status: 'success', data });
    } catch (err) {
        console.warn('[feature-impact] ML service unavailable:', err.message);
        // Return a graceful static fallback so the dashboard doesn't blank out
        const fallback = [
            { feature: 'rainfall',    label: 'Rainfall',          importance: 0.28, pct: 28.0, direction: 'positive', effect_description: 'Adequate rainfall is the top yield driver' },
            { feature: 'N',           label: 'Nitrogen (N)',       importance: 0.22, pct: 22.0, direction: 'positive', effect_description: 'Primary macronutrient — critical for leaf growth' },
            { feature: 'temperature', label: 'Temperature',        importance: 0.18, pct: 18.0, direction: 'neutral',  effect_description: 'Temperature controls metabolic rate' },
            { feature: 'K',           label: 'Potassium (K)',      importance: 0.14, pct: 14.0, direction: 'positive', effect_description: 'Supports stress resistance and quality' },
            { feature: 'ph',          label: 'Soil pH',            importance: 0.10, pct: 10.0, direction: 'positive', effect_description: 'pH controls nutrient availability' },
            { feature: 'P',           label: 'Phosphorus (P)',     importance: 0.10, pct: 10.0, direction: 'positive', effect_description: 'Root development and energy transfer' },
            { feature: 'humidity',    label: 'Humidity',           importance: 0.08, pct: 8.0,  direction: 'neutral',  effect_description: 'Affects transpiration and disease risk' },
            { feature: 'NPK_total',   label: 'Total NPK',          importance: 0.06, pct: 6.0,  direction: 'positive', effect_description: 'Combined nutrient load' },
            { feature: 'temp_humidity',label:'Heat-Moisture Index', importance: 0.05, pct: 5.0,  direction: 'neutral',  effect_description: 'Heat x humidity stress index' },
            { feature: 'ph_deviation',label: 'pH Deviation',       importance: 0.05, pct: 5.0,  direction: 'negative', effect_description: 'Distance from neutral pH' },
            { feature: 'rain_humidity',label:'Aridity Index',       importance: 0.04, pct: 4.0,  direction: 'neutral',  effect_description: 'Rainfall relative to humidity' },
            { feature: 'N_P_ratio',   label: 'N:P Ratio',          importance: 0.04, pct: 4.0,  direction: 'neutral',  effect_description: 'Nitrogen-phosphorus balance' },
        ];
        res.json({
            status: 'success',
            data: { features: fallback, model_used: 'heuristic_fallback', method: 'static_weights', n_features: fallback.length }
        });
    }
});

module.exports = router;
