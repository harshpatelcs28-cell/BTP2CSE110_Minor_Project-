"""
Adaptive CropShield — Flask Backend API
Endpoints: /predict, /explain, /weather, /optimize, /history
"""

import os
import json
import traceback
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from ml.predict import CropPredictor
from ml.optimizer import ResourceOptimizer
from services.weather import WeatherService
from database.db import Database

load_dotenv()

app = Flask(__name__)
CORS(app, origins=os.getenv("ALLOWED_ORIGINS", "*"))

predictor = CropPredictor()
optimizer = ResourceOptimizer()
weather_svc = WeatherService(api_key=os.getenv("OPENWEATHER_API_KEY", ""))
db = Database(uri=os.getenv("MONGO_URI", "mongodb://localhost:27017"), db_name="cropshield")


def success(data: dict, status: int = 200):
    return jsonify({"status": "success", "data": data}), status


def error(message: str, status: int = 400):
    return jsonify({"status": "error", "message": message}), status


@app.route("/health", methods=["GET"])
def health():
    return success({"service": "Adaptive CropShield API", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()})


@app.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    Body: { crop, N, P, K, temperature, humidity, ph, rainfall, soil_type }
    Returns: { crop, predicted_yield, yield_unit, confidence, model_used }
    """
    try:
        body = request.get_json(force=True)
        required = ["crop", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        missing = [f for f in required if f not in body]
        if missing:
            return error(f"Missing required fields: {', '.join(missing)}")

        features = {
            "N": float(body["N"]),
            "P": float(body["P"]),
            "K": float(body["K"]),
            "temperature": float(body["temperature"]),
            "humidity": float(body["humidity"]),
            "ph": float(body["ph"]),
            "rainfall": float(body["rainfall"]),
        }

        # Validate ranges
        bounds = {"N":(0,140),"P":(5,145),"K":(5,205),"temperature":(8,44),"humidity":(14,100),"ph":(3.5,10),"rainfall":(20,299)}
        for key, (lo, hi) in bounds.items():
            if not lo <= features[key] <= hi:
                return error(f"{key} out of valid range [{lo}, {hi}]")

        result = predictor.predict(crop=body["crop"], features=features)

        record = {
            "crop": body["crop"],
            "soil_type": body.get("soil_type", "Unknown"),
            "inputs": features,
            "predicted_yield": result["predicted_yield"],
            "confidence": result["confidence"],
            "model_used": result["model_used"],
            "timestamp": datetime.utcnow().isoformat(),
        }
        db.predictions.insert_one({k: v for k, v in record.items()})

        return success(record)

    except ValueError as e:
        return error(f"Invalid input: {str(e)}")
    except Exception:
        traceback.print_exc()
        return error("Internal server error", 500)


@app.route("/explain", methods=["POST"])
def explain():
    """
    POST /explain
    Body: same as /predict
    Returns: { shap_values: [{feature, value, impact}], base_value, plot_url }
    """
    try:
        body = request.get_json(force=True)
        features = {
            "N": float(body["N"]), "P": float(body["P"]), "K": float(body["K"]),
            "temperature": float(body["temperature"]), "humidity": float(body["humidity"]),
            "ph": float(body["ph"]), "rainfall": float(body["rainfall"]),
        }
        explanation = predictor.explain(features=features)
        return success(explanation)
    except Exception:
        traceback.print_exc()
        return error("Explanation failed", 500)


@app.route("/weather", methods=["GET"])
def weather():
    """
    GET /weather?lat=28.6&lon=77.2
    OR  GET /weather?city=Delhi
    Returns: { temperature, humidity, rainfall, description, city }
    """
    try:
        city = request.args.get("city")
        lat = request.args.get("lat")
        lon = request.args.get("lon")

        if city:
            data = weather_svc.by_city(city)
        elif lat and lon:
            data = weather_svc.by_coords(float(lat), float(lon))
        else:
            return error("Provide 'city' or 'lat' and 'lon' query parameters")

        return success(data)
    except Exception:
        traceback.print_exc()
        return error("Weather fetch failed", 500)


@app.route("/optimize", methods=["POST"])
def optimize():
    """
    POST /optimize
    Body: { crop, N, P, K, rainfall, soil_type, target_yield? }
    Returns: { water, nitrogen, phosphorus, potassium, estimated_cost_inr }
    """
    try:
        body = request.get_json(force=True)
        recs = optimizer.recommend(
            crop=body.get("crop", "Rice"),
            N=float(body.get("N", 50)),
            P=float(body.get("P", 50)),
            K=float(body.get("K", 50)),
            rainfall=float(body.get("rainfall", 100)),
            soil_type=body.get("soil_type", "Alluvial"),
        )
        return success(recs)
    except Exception:
        traceback.print_exc()
        return error("Optimization failed", 500)


@app.route("/history", methods=["GET"])
def history():
    """
    GET /history?limit=20
    Returns: list of past predictions
    """
    try:
        limit = int(request.args.get("limit", 20))
        records = list(db.predictions.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
        return success({"count": len(records), "predictions": records})
    except Exception:
        traceback.print_exc()
        return error("History fetch failed", 500)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "production") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
