"""
Adaptive CropShield — Standalone ML Service
Runs on port 5001. Node.js backend proxies prediction calls here.
Endpoints:
  GET  /ml/health
  POST /ml/predict   → real RandomForest/XGBoost yield prediction + SHAP
  POST /ml/explain   → SHAP feature importance
  POST /ml/optimize  → resource recommendations
  POST /ml/batch     → batch row predictions (for CSV upload)
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))   # ensure root imports work

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# Import our ML modules from the project root
from predict import CropPredictor
from optimizer import ResourceOptimizer

app = Flask(__name__)
CORS(app)

# Initialise once at startup
print("[ml_service] Loading models...")
predictor = CropPredictor()
optimizer = ResourceOptimizer()
print(f"[ml_service] Ready — model loaded: {predictor.is_ready}")


def ok(data):
    return jsonify({"status": "success", "data": data})

def err(msg, code=400):
    return jsonify({"status": "error", "message": msg}), code


# ── Health ──────────────────────────────────────────────────────────────────
@app.route("/ml/health", methods=["GET"])
def health():
    return ok({
        "service": "CropShield ML Engine",
        "model_ready": predictor.is_ready,
        "timestamp": datetime.utcnow().isoformat()
    })


# ── Predict ─────────────────────────────────────────────────────────────────
@app.route("/ml/predict", methods=["POST"])
def predict():
    body = request.get_json(force=True) or {}
    required = ["crop", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    missing = [f for f in required if f not in body]
    if missing:
        return err(f"Missing fields: {', '.join(missing)}")

    try:
        features = {
            "N":           float(body["N"]),
            "P":           float(body["P"]),
            "K":           float(body["K"]),
            "temperature": float(body["temperature"]),
            "humidity":    float(body["humidity"]),
            "ph":          float(body["ph"]),
            "rainfall":    float(body["rainfall"]),
        }
        result = predictor.predict(crop=body["crop"], features=features)
        # Also embed SHAP explanation inline
        explanation = predictor.explain(features=features)
        result["explanation"] = explanation
        result["inputs"] = features
        result["soil_type"] = body.get("soil_type", "Unknown")
        return ok(result)
    except Exception as e:
        return err(str(e), 500)


# ── Explain ─────────────────────────────────────────────────────────────────
@app.route("/ml/explain", methods=["POST"])
def explain():
    body = request.get_json(force=True) or {}
    try:
        features = {
            "N":           float(body.get("N", 60)),
            "P":           float(body.get("P", 45)),
            "K":           float(body.get("K", 40)),
            "temperature": float(body.get("temperature", 25)),
            "humidity":    float(body.get("humidity", 70)),
            "ph":          float(body.get("ph", 6.5)),
            "rainfall":    float(body.get("rainfall", 100)),
        }
        return ok(predictor.explain(features=features))
    except Exception as e:
        return err(str(e), 500)


# ── Optimize ─────────────────────────────────────────────────────────────────
@app.route("/ml/optimize", methods=["POST"])
def optimize():
    body = request.get_json(force=True) or {}
    try:
        result = optimizer.recommend(
            crop=body.get("crop", "Rice"),
            N=float(body.get("N", 50)),
            P=float(body.get("P", 50)),
            K=float(body.get("K", 50)),
            rainfall=float(body.get("rainfall", 100)),
            soil_type=body.get("soil_type", "Alluvial"),
        )
        return ok(result)
    except Exception as e:
        return err(str(e), 500)


# ── Batch (CSV rows) ─────────────────────────────────────────────────────────
@app.route("/ml/batch", methods=["POST"])
def batch():
    """
    Accepts a list of row dicts. Each row: {temperature, rainfall, humidity, ph, ...}.
    Returns per-row ML calibrated readings + aggregate yield projections.
    """
    body = request.get_json(force=True) or {}
    rows = body.get("rows", [])
    if not rows:
        return err("No rows provided")

    results = []
    for row in rows:
        def _get_val(r, k1, k2, default):
            v = r.get(k1)
            if v is None: v = r.get(k2)
            if v is None: v = default
            # Handle empty strings from bad CSVs
            try: return float(v)
            except (ValueError, TypeError): return default

        temp  = _get_val(row, "temperature", "Temperature", 25.0)
        rain  = _get_val(row, "rainfall",    "Rainfall",    50.0)
        humid = _get_val(row, "humidity",    "Humidity",    65.0)
        
        ph_v = row.get("soil_ph", row.get("ph", row.get("pH")))
        ph = float(ph_v) if ph_v is not None and ph_v != "" else 6.8
        
        N = float(row.get("N") if row.get("N") not in (None, "") else 60.0)
        P = float(row.get("P") if row.get("P") not in (None, "") else 45.0)
        K = float(row.get("K") if row.get("K") not in (None, "") else 40.0)

        features = {
            "N": N, "P": P, "K": K,
            "temperature": temp,
            "humidity": humid,
            "ph": ph,
            "rainfall": rain,
        }

        # Infer best crop from conditions (simple heuristic)
        if temp > 30 and rain > 150:
            crop = "rice"
        elif temp < 22 and rain < 100:
            crop = "wheat"
        elif humid > 80:
            crop = "banana"
        else:
            crop = "maize"

        try:
            pred = predictor.predict(crop=crop, features=features)
        except Exception:
            pred = {"predicted_yield": 3.5, "confidence": 70, "model_used": "fallback"}

        # ML-corrected (simulated intervention)
        adj_temp  = max(temp  - 5, 20)  if temp  > 35 else temp
        adj_rain  = min(rain  + 15, 100) if rain  < 20 else rain
        adj_humid = min(humid + 12, 85)  if humid < 40 else humid

        results.append({
            "raw":  {"temp": temp, "rain": rain, "humidity": humid, "ph": ph},
            "adj":  {"temp": adj_temp, "rain": adj_rain, "humidity": adj_humid, "ph": ph},
            "predicted_yield":     pred.get("predicted_yield", 3.5),
            "predicted_yield_adj": round(pred.get("predicted_yield", 3.5) * 1.15, 2),
            "confidence":          pred.get("confidence", 70),
            "model_used":          pred.get("model_used", "rule_based"),
            "crop_inferred":       crop,
        })

    # Aggregate
    avg_yield     = round(sum(r["predicted_yield"]     for r in results) / len(results), 2)
    avg_yield_adj = round(sum(r["predicted_yield_adj"] for r in results) / len(results), 2)
    avg_conf      = round(sum(r["confidence"]          for r in results) / len(results), 1)

    raw_impacts   = [-(((r["raw"]["temp"] > 35) * 25) + ((r["raw"]["rain"] < 15) * 30) + ((r["raw"]["rain"] > 100) * 20)) for r in results]
    avg_raw_impact = round(sum(raw_impacts) / len(raw_impacts), 1)
    avg_adj_impact = round(avg_raw_impact * 0.4, 1)

    risk = "Critical" if avg_raw_impact <= -25 else ("Elevated" if avg_raw_impact < 0 else "Optimal")

    BASE = 100
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    noAction    = [round(BASE + avg_raw_impact * 0.18 * (i + 1), 1) for i in range(6)]
    withAction  = [round(BASE + avg_raw_impact * 0.07 * (i + 1), 1) for i in range(6)]
    timeSeries  = [{"month": m, "noAction": noAction[i], "withAction": withAction[i]} for i, m in enumerate(months)]

    return ok({
        "rowsProcessed":      len(results),
        "avgPredictedYield":  avg_yield,
        "avgAdjYield":        avg_yield_adj,
        "avgConfidence":      avg_conf,
        "avgRawYieldImpact":  avg_raw_impact,
        "avgAdjYieldImpact":  avg_adj_impact,
        "overallRisk":        risk,
        "timeSeries":         timeSeries,
        "sampleRows":         results[:6],
        "modelUsed":          results[0]["model_used"] if results else "unknown",
    })


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", 5001))
    print(f"[ml_service] Starting on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
