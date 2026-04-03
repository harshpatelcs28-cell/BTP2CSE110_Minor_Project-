const express = require('express');
const fetch = require('node-fetch');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../database');

const router = express.Router();
const ML_SERVICE = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Helper: proxy POST to ML service with fallback
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

// Rule-based fallback when ML service is down
function ruleBasedFallback(cropType) {
    const yields = {
        Wheat: { base: 3.8, unit: 'tonnes/ha' },
        Corn:  { base: 5.2, unit: 'tonnes/ha' },
        Rice:  { base: 4.5, unit: 'tonnes/ha' },
        Soybeans: { base: 2.8, unit: 'tonnes/ha' },
    };
    const info = yields[cropType] || { base: 3.5, unit: 'tonnes/ha' };
    const variance = (Math.random() - 0.5) * 0.6;
    const yieldVal = +(info.base + variance).toFixed(2);
    return {
        prediction: `${yieldVal} ${info.unit}`,
        confidence: Math.floor(68 + Math.random() * 20),
        model_used: 'rule_based_fallback',
        predicted_yield: yieldVal,
        yield_unit: info.unit,
    };
}

// POST /api/predict  — main yield prediction endpoint
router.post('/', verifyToken, async (req, res) => {
    const { cropType, location, soilType, N, P, K, temperature, humidity, ph, rainfall } = req.body;

    if (!cropType) return res.status(400).json({ error: 'cropType is required' });

    // Build feature set with defaults when not provided
    const features = {
        crop: cropType,
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
        result = await callML('/ml/predict', features);
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

    // Unified response shape
    res.json({
        prediction:     mlOnline ? `${result.predicted_yield} ${result.yield_unit}` : result.prediction,
        confidence:     result.confidence,
        model_used:     result.model_used || result.model_used,
        predicted_yield: result.predicted_yield,
        yield_unit:     result.yield_unit,
        yield_range:    result.yield_range,
        explanation:    result.explanation || null,
        ml_online:      mlOnline,
    });
});

module.exports = router;
