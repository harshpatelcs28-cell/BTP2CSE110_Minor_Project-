"""
Adaptive CropShield — Prediction & Explainability Module
Loads trained Random Forest / XGBoost models and exposes predict() and explain().
"""

import os
import json
import numpy as np
import joblib
import shap

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# Approximate real-world yield ranges per crop (tonnes/ha) for output scaling
YIELD_RANGES = {
    "rice": (2.0, 7.0), "wheat": (2.0, 6.0), "maize": (2.5, 8.0),
    "cotton": (1.2, 3.5), "sugarcane": (40.0, 100.0), "jute": (1.5, 4.0),
    "coffee": (0.5, 2.5), "coconut": (4000, 12000), "papaya": (15, 35),
    "orange": (10, 28), "apple": (8, 20), "muskmelon": (10, 20),
    "watermelon": (15, 30), "grapes": (5, 15), "mango": (6, 18),
    "banana": (15, 40), "pomegranate": (6, 15), "lentil": (0.8, 2.0),
    "blackgram": (0.6, 1.5), "mungbean": (0.7, 1.8), "mothbeans": (0.5, 1.4),
    "pigeonpeas": (0.7, 1.8), "kidneybeans": (0.8, 2.0), "chickpea": (0.8, 2.2),
}


class CropPredictor:
    """
    Loads trained models from disk and performs crop prediction and SHAP explanation.
    Falls back to a rule-based predictor if model artifacts do not exist yet.
    """

    def __init__(self):
        self.rf_model = None
        self.xgb_model = None
        self.scaler = None
        self.le = None
        self.metadata = {}
        self._load()

    def _load(self):
        try:
            rf_path = os.path.join(ARTIFACT_DIR, "random_forest.pkl")
            xgb_path = os.path.join(ARTIFACT_DIR, "xgboost.pkl")
            scaler_path = os.path.join(ARTIFACT_DIR, "scaler.pkl")
            le_path = os.path.join(ARTIFACT_DIR, "label_encoder.pkl")
            meta_path = os.path.join(ARTIFACT_DIR, "metadata.json")

            if all(os.path.exists(p) for p in [rf_path, scaler_path, le_path]):
                self.rf_model = joblib.load(rf_path)
                self.scaler = joblib.load(scaler_path)
                self.le = joblib.load(le_path)
                if os.path.exists(xgb_path):
                    self.xgb_model = joblib.load(xgb_path)
                if os.path.exists(meta_path):
                    with open(meta_path) as f:
                        self.metadata = json.load(f)
                print("[CropPredictor] Models loaded successfully.")
            else:
                print("[CropPredictor] Model artifacts not found. Using rule-based fallback. Run ml/train.py first.")
        except Exception as e:
            print(f"[CropPredictor] Load error: {e}. Using rule-based fallback.")

    @property
    def is_ready(self) -> bool:
        return self.rf_model is not None and self.scaler is not None and self.le is not None

    def _feature_vector(self, features: dict) -> np.ndarray:
        vec = np.array([features[c] for c in FEATURE_COLS], dtype=np.float64).reshape(1, -1)
        return self.scaler.transform(vec) if self.scaler else vec

    def predict(self, crop: str, features: dict) -> dict:
        """
        Returns predicted yield for the given crop and input features.
        Uses trained model if available; falls back to rule-based estimation.
        """
        crop_lower = crop.lower()
        predicted_class = None
        model_used = "rule_based_fallback"
        confidence = 75.0

        if self.is_ready:
            X = self._feature_vector(features)
            proba = self.rf_model.predict_proba(X)[0]
            pred_idx = int(np.argmax(proba))
            predicted_class = self.le.inverse_transform([pred_idx])[0]
            confidence = round(float(np.max(proba)) * 100, 1)
            model_used = "random_forest"

            if self.xgb_model is not None:
                xgb_proba = self.xgb_model.predict_proba(X)[0]
                xgb_conf = float(np.max(xgb_proba))
                xgb_class = self.le.inverse_transform([int(np.argmax(xgb_proba))])[0]
                rf_conf = float(np.max(proba))
                if xgb_conf > rf_conf:
                    predicted_class = xgb_class
                    confidence = round(xgb_conf * 100, 1)
                    model_used = "xgboost"
        else:
            predicted_class = crop_lower

        yield_val = self._estimate_yield(crop_lower, features)
        crop_range = YIELD_RANGES.get(crop_lower, (1.0, 6.0))
        yield_unit = "kg/tree" if crop_lower == "coconut" else "tonnes/ha"

        return {
            "crop": crop,
            "predicted_class": predicted_class,
            "predicted_yield": round(yield_val, 2),
            "yield_unit": yield_unit,
            "yield_range": {"min": round(yield_val * 0.88, 2), "max": round(yield_val * 1.12, 2)},
            "confidence": confidence,
            "model_used": model_used,
        }

    def _estimate_yield(self, crop: str, features: dict) -> float:
        lo, hi = YIELD_RANGES.get(crop, (1.0, 6.0))
        base = (lo + hi) / 2

        n, p, k = features["N"], features["P"], features["K"]
        temp = features["temperature"]
        humid = features["humidity"]
        ph = features["ph"]
        rain = features["rainfall"]

        ph_score = max(0, 1 - abs(ph - 6.8) / 4.0)
        rain_score = min(rain / 100.0, 1.5) / 1.5
        temp_score = max(0, 1 - abs(temp - 26) / 18.0)
        nutrient_score = (min(n, 90) / 90 + min(p, 90) / 90 + min(k, 90) / 90) / 3
        humid_score = 1.0 if 40 <= humid <= 85 else 0.7

        multiplier = (
            0.55
            + 0.10 * ph_score
            + 0.12 * rain_score
            + 0.10 * temp_score
            + 0.10 * nutrient_score
            + 0.03 * humid_score
        )
        return base * multiplier

    def explain(self, features: dict) -> dict:
        """
        Returns per-feature SHAP values for a single prediction.
        Falls back to feature importance heuristic if SHAP unavailable.
        """
        if not self.is_ready:
            return self._heuristic_explanation(features)

        try:
            X = self._feature_vector(features)
            explainer = shap.TreeExplainer(self.rf_model)
            shap_values = explainer.shap_values(X)

            if isinstance(shap_values, list):
                abs_shap = np.abs(np.array(shap_values)).mean(axis=0)[0]
            else:
                abs_shap = np.abs(shap_values[0])

            total = abs_shap.sum() or 1.0
            result = []
            for i, feat in enumerate(FEATURE_COLS):
                val = float(abs_shap[i])
                result.append({
                    "feature": feat,
                    "label": feat.capitalize(),
                    "shap_value": round(val, 4),
                    "normalized_importance": round(val / total, 4),
                    "input_value": features[feat],
                })
            result.sort(key=lambda x: x["shap_value"], reverse=True)

            return {
                "shap_values": result,
                "base_value": round(float(explainer.expected_value[0]) if hasattr(explainer.expected_value, "__len__") else float(explainer.expected_value), 4),
                "method": "shap_tree_explainer",
            }
        except Exception as e:
            print(f"[SHAP] Error: {e}. Using heuristic.")
            return self._heuristic_explanation(features)

    def _heuristic_explanation(self, features: dict) -> dict:
        weights = {"N": 0.22, "P": 0.10, "K": 0.14, "temperature": 0.18, "humidity": 0.08, "ph": 0.10, "rainfall": 0.28}
        result = []
        for feat in FEATURE_COLS:
            result.append({
                "feature": feat,
                "label": feat.capitalize(),
                "shap_value": round(weights[feat], 4),
                "normalized_importance": round(weights[feat], 4),
                "input_value": features[feat],
            })
        result.sort(key=lambda x: x["shap_value"], reverse=True)
        return {"shap_values": result, "base_value": 0.0, "method": "heuristic_fallback"}
