const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const fetch = require('node-fetch');
const { verifyToken } = require('../middleware/authMiddleware');
const { insertAlert } = require('./alerts');

const router = express.Router();
const ML_SERVICE = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Rule-based fallback (when ML service down) ───────────────────────────
function ruleBasedBatch(rows) {
    let totalImpact = 0;
    const processed = rows.map(row => {
        const temp  = parseFloat(row.temperature ?? row.Temperature ?? 25);
        const rain  = parseFloat(row.rainfall    ?? row.Rainfall    ?? 50);
        const humid = parseFloat(row.humidity    ?? row.Humidity    ?? 65);
        const ph    = parseFloat(row.soil_ph     ?? row.ph          ?? row.pH ?? 6.8);

        let impact = 0;
        if (temp > 35) impact -= 25;
        else if (temp > 30) impact -= 10;
        if (rain < 15) impact -= 30;
        else if (rain < 30) impact -= 15;
        else if (rain > 100) impact -= 20;
        totalImpact += impact;

        return {
            raw: { temp, rain, humidity: humid, ph },
            adj: {
                temp:     temp > 35 ? temp - 5 : temp,
                rain:     rain < 20 ? rain + 15 : rain,
                humidity: humid < 40 ? humid + 12 : humid,
                ph,
            },
            predicted_yield:     3.5,
            predicted_yield_adj: 4.0,
            confidence:          72,
            model_used:          'rule_based_fallback',
        };
    });

    const avgImpact = +(totalImpact / rows.length).toFixed(1);
    const adjImpact = +(avgImpact * 0.4).toFixed(1);
    const risk      = avgImpact <= -25 ? 'Critical' : avgImpact < 0 ? 'Elevated' : 'Optimal';
    const months    = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const timeSeries = months.map((month, i) => ({
        month,
        withAction: +(100 + avgImpact * 0.07 * (i + 1)).toFixed(1),
        noAction:   +(100 + avgImpact * 0.18 * (i + 1)).toFixed(1),
    }));

    return {
        rowsProcessed:     rows.length,
        avgPredictedYield: 3.5,
        avgAdjYield:       4.0,
        avgConfidence:     72,
        avgRawYieldImpact: avgImpact,
        avgAdjYieldImpact: adjImpact,
        overallRisk:       risk,
        timeSeries,
        sampleRows: processed.slice(0, 6),
        modelUsed: 'rule_based_fallback',
    };
}

// ─── POST /api/dataset/upload ─────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('dataset'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded.' });

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString('utf-8'));

    stream
        .pipe(csv())
        .on('data', row => rows.push(row))
        .on('end', async () => {
            if (rows.length === 0) return res.status(400).json({ error: 'CSV is empty or malformed.' });

            let result;
            let mlOnline = false;

            try {
                // Try real ML batch prediction
                const mlResp = await fetch(`${ML_SERVICE}/ml/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows }),
                    timeout: 30000,
                });
                if (!mlResp.ok) throw new Error(`ML responded ${mlResp.status}`);
                const mlData = await mlResp.json();
                result = mlData.data;
                mlOnline = true;
            } catch (mlErr) {
                console.warn('[dataset] ML service unavailable, using fallback:', mlErr.message);
                result = ruleBasedBatch(rows);
            }

            // Seed persistent alerts based on results
            const risk = result.overallRisk || 'Optimal';
            if (risk === 'Critical') {
                insertAlert(req.userId, 'critical',
                    `Dataset Analysis — Critical conditions detected. Avg yield impact: ${result.avgRawYieldImpact}%. Immediate action required.`);
            } else if (risk === 'Elevated') {
                insertAlert(req.userId, 'warning',
                    `Dataset Analysis — Elevated risk detected. Avg yield impact: ${result.avgRawYieldImpact}%. ML adjustments applied.`);
            }

            // Normalise sampleRows to a consistent shape for the frontend table
            const sampleRows = (result.sampleRows || []).slice(0, 6).map(r => ({
                rawTemp:     r.raw?.temp     ?? r.rawTemp,
                adjTemp:     r.adj?.temp     ?? r.adjTemp,
                rawRain:     r.raw?.rain     ?? r.rawRain,
                adjRain:     r.adj?.rain     ?? r.adjRain,
                rawHumidity: r.raw?.humidity ?? r.rawHumidity,
                adjHumidity: r.adj?.humidity ?? r.adjHumidity,
                rawPH:       r.raw?.ph       ?? r.rawPH,
                adjPH:       r.adj?.ph       ?? r.adjPH,
                predictedYield:    r.predicted_yield     ?? r.predictedYield,
                predictedYieldAdj: r.predicted_yield_adj ?? r.predictedYieldAdj,
                confidence:        r.confidence,
                modelUsed:         r.model_used          ?? r.modelUsed,
                cropInferred:      r.crop_inferred        ?? r.cropInferred,
            }));

            res.json({
                rowsProcessed:      result.rowsProcessed,
                avgPredictedYield:  result.avgPredictedYield,
                avgAdjYield:        result.avgAdjYield,
                avgConfidence:      result.avgConfidence,
                avgRawYieldImpact:  result.avgRawYieldImpact,
                avgAdjYieldImpact:  result.avgAdjYieldImpact,
                overallRisk:        result.overallRisk,
                timeSeries:         result.timeSeries,
                sampleRows,
                modelUsed:          result.modelUsed,
                mlOnline,
            });
        })
        .on('error', err => {
            console.error('[dataset] CSV parse error:', err);
            res.status(500).json({ error: 'Failed to parse CSV.' });
        });
});

module.exports = router;
