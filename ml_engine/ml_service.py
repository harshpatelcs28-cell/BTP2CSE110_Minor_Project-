"""
Adaptive CropShield — ML Service (v2)
======================================
Flask microservice running on port 5001.
Node.js backend proxies calls here.

Endpoints:
  GET  /ml/health            → service + model status
  POST /ml/predict           → crop classification + yield + signed SHAP
  POST /ml/explain           → signed SHAP breakdown for a given feature set
  GET  /ml/feature-impact    → global model feature importances (for dashboard viz)
  POST /ml/optimize          → resource (water + fertilizer) recommendations
  POST /ml/batch             → batch CSV row predictions
"""

import sys, os, time, logging
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

from predict import CropPredictor
from optimizer import ResourceOptimizer

# ── App setup ─────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("ml_service")

app = Flask(__name__)
CORS(app)

log.info("Loading ML models…")
predictor = CropPredictor()
optimizer = ResourceOptimizer()
log.info(f"Ready — model loaded: {predictor.is_ready}")


# ── Response helpers ──────────────────────────────────────────────────────────
def ok(data, elapsed=None):
    resp = {"status": "success", "data": data}
    if elapsed is not None:
        resp["elapsed_ms"] = round(elapsed * 1000, 1)
    return jsonify(resp)

def err(msg, code=400):
    return jsonify({"status": "error", "message": msg}), code


# ── Health ────────────────────────────────────────────────────────────────────
@app.route("/ml/health", methods=["GET"])
def health():
    return ok({
        "service":       "CropShield ML Engine v2",
        "model_ready":   predictor.is_ready,
        "best_model":    predictor.metadata.get("best_model", "none"),
        "n_classes":     predictor.metadata.get("num_classes", 0),
        "n_features":    len(predictor.metadata.get("all_feature_cols", [])),
        "timestamp":     datetime.utcnow().isoformat(),
    })


# ── Predict ───────────────────────────────────────────────────────────────────
@app.route("/ml/predict", methods=["POST"])
def predict():
    t0   = time.time()
    body = request.get_json(force=True) or {}
    required = ["crop", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    missing  = [f for f in required if f not in body]
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
        result      = predictor.predict(crop=body["crop"], features=features)
        explanation = predictor.explain(features=features)
        result["explanation"] = explanation
        result["inputs"]      = features
        result["soil_type"]   = body.get("soil_type", "Unknown")
        return ok(result, time.time() - t0)
    except Exception as e:
        log.exception("predict error")
        return err(str(e), 500)


# ── Explain ───────────────────────────────────────────────────────────────────
@app.route("/ml/explain", methods=["POST"])
def explain():
    t0   = time.time()
    body = request.get_json(force=True) or {}
    try:
        features = {
            "N":           float(body.get("N",           60)),
            "P":           float(body.get("P",           45)),
            "K":           float(body.get("K",           40)),
            "temperature": float(body.get("temperature", 25)),
            "humidity":    float(body.get("humidity",    70)),
            "ph":          float(body.get("ph",          6.5)),
            "rainfall":    float(body.get("rainfall",   100)),
        }
        return ok(predictor.explain(features=features), time.time() - t0)
    except Exception as e:
        log.exception("explain error")
        return err(str(e), 500)


# ── Feature Impact (global) ───────────────────────────────────────────────────
@app.route("/ml/feature-impact", methods=["GET"])
def feature_impact():
    """
    Returns global model feature importances — no input features required.
    Used by the Dashboard analytics tab to power the bar + pie visualization.
    """
    t0 = time.time()
    try:
        result = predictor.feature_impact()
        return ok(result, time.time() - t0)
    except Exception as e:
        log.exception("feature-impact error")
        return err(str(e), 500)


# ── Optimize ──────────────────────────────────────────────────────────────────
@app.route("/ml/optimize", methods=["POST"])
def optimize():
    body = request.get_json(force=True) or {}
    try:
        result = optimizer.recommend(
            crop      = body.get("crop", "Rice"),
            N         = float(body.get("N", 50)),
            P         = float(body.get("P", 50)),
            K         = float(body.get("K", 50)),
            rainfall  = float(body.get("rainfall", 100)),
            soil_type = body.get("soil_type", "Alluvial"),
        )
        return ok(result)
    except Exception as e:
        log.exception("optimize error")
        return err(str(e), 500)


# ── Batch ─────────────────────────────────────────────────────────────────────
@app.route("/ml/batch", methods=["POST"])
def batch():
    body = request.get_json(force=True) or {}
    rows = body.get("rows", [])
    if not rows:
        return err("No rows provided")

    def _fval(r, *keys, default=0.0):
        for k in keys:
            v = r.get(k)
            if v not in (None, ""):
                try:
                    return float(v)
                except (ValueError, TypeError):
                    pass
        return default

    results = []
    for row in rows:
        temp  = _fval(row, "temperature", "Temperature", default=25.0)
        rain  = _fval(row, "rainfall",    "Rainfall",    default=50.0)
        humid = _fval(row, "humidity",    "Humidity",    default=65.0)
        ph    = _fval(row, "soil_ph", "ph", "pH",        default=6.8)
        N     = _fval(row, "N",                          default=60.0)
        P     = _fval(row, "P",                          default=45.0)
        K     = _fval(row, "K",                          default=40.0)

        features = {"N": N, "P": P, "K": K,
                    "temperature": temp, "humidity": humid,
                    "ph": ph, "rainfall": rain}

        # Infer likely crop from conditions (simple heuristic)
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

        adj_temp  = max(temp  - 5, 20) if temp  > 35 else temp
        adj_rain  = min(rain  + 15, 100) if rain < 20 else rain
        adj_humid = min(humid + 12, 85)  if humid < 40 else humid

        results.append({
            "raw":               {"temp": temp, "rain": rain, "humidity": humid, "ph": ph},
            "adj":               {"temp": adj_temp, "rain": adj_rain, "humidity": adj_humid, "ph": ph},
            "predicted_yield":   pred.get("predicted_yield", 3.5),
            "predicted_yield_adj": round(pred.get("predicted_yield", 3.5) * 1.15, 2),
            "confidence":        pred.get("confidence", 70),
            "model_used":        pred.get("model_used", "rule_based"),
            "crop_inferred":     crop,
            # Renamed keys for frontend table compatibility
            "rawTemp": temp, "adjTemp": adj_temp,
            "rawRain": rain, "adjRain": adj_rain,
            "rawHumidity": humid, "adjHumidity": adj_humid, "adjPH": ph,
        })

    avg_yield     = round(sum(r["predicted_yield"]     for r in results) / len(results), 2)
    avg_yield_adj = round(sum(r["predicted_yield_adj"] for r in results) / len(results), 2)
    avg_conf      = round(sum(r["confidence"]          for r in results) / len(results), 1)

    raw_impacts   = [-(((r["raw"]["temp"] > 35) * 25) + ((r["raw"]["rain"] < 15) * 30) + ((r["raw"]["rain"] > 100) * 20)) for r in results]
    avg_raw_impact = round(sum(raw_impacts) / len(raw_impacts), 1)
    avg_adj_impact = round(avg_raw_impact * 0.4, 1)
    risk = "Critical" if avg_raw_impact <= -25 else ("Elevated" if avg_raw_impact < 0 else "Optimal")

    BASE   = 100
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    noAction   = [round(BASE + avg_raw_impact * 0.18 * (i + 1), 1) for i in range(6)]
    withAction = [round(BASE + avg_raw_impact * 0.07 * (i + 1), 1) for i in range(6)]
    timeSeries = [{"month": m, "noAction": noAction[i], "withAction": withAction[i]} for i, m in enumerate(months)]

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


# ── Entry ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", 5001))
    log.info(f"Starting CropShield ML Service on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
