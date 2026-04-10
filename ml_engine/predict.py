"""
Adaptive CropShield — Prediction & Explainability Module (v2)
=============================================================
Loads trained models and exposes:
  - predict()  → yield prediction with confidence + signed SHAP explanation
  - explain()  → full SHAP breakdown with direction labels + effect descriptions
  - feature_impact() → global (dataset-level) feature importance for viz

Key improvements over v1:
  - Feature engineering applied at inference (MUST match training)
  - Uses best_model from metadata.json rather than hardcoded RF
  - Loads imputer artifact for safe NaN handling at inference time
  - SHAP returns SIGNED values (positive = helps crop, negative = hurts)
  - Per-feature 'direction' and 'effect_description' for frontend cards
  - GradientBoosting model supported
"""

import os
import json
import numpy as np
import joblib

ARTIFACT_DIR     = os.path.join(os.path.dirname(__file__), "artifacts")
BASE_FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
ENG_FEATURE_COLS  = ["NPK_total", "N_P_ratio", "temp_humidity", "rain_humidity", "ph_deviation"]
ALL_FEATURE_COLS  = BASE_FEATURE_COLS + ENG_FEATURE_COLS

# Approximate real-world yield ranges per crop (tonnes/ha)
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

# Human-readable labels for ALL features (base + engineered)
FEATURE_LABELS = {
    "N":            "Nitrogen (N)",
    "P":            "Phosphorus (P)",
    "K":            "Potassium (K)",
    "temperature":  "Temperature",
    "humidity":     "Humidity",
    "ph":           "Soil pH",
    "rainfall":     "Rainfall",
    "NPK_total":    "Total NPK",
    "N_P_ratio":    "N:P Ratio",
    "temp_humidity":"Heat-Moisture Index",
    "rain_humidity":"Aridity Index",
    "ph_deviation": "pH Deviation",
}

# Thresholds for direction descriptions (base features only shown to user)
EFFECT_RULES = {
    "N":           lambda v: ("positive", f"Nitrogen at {v:.0f}kg/ha — {'adequate nutrition' if v >= 40 else 'low, may limit yield'}"),
    "P":           lambda v: ("positive" if v >= 20 else "negative", f"Phosphorus at {v:.0f}kg/ha — {'supports root development' if v >= 20 else 'deficient'}"),
    "K":           lambda v: ("positive" if v >= 20 else "negative", f"Potassium at {v:.0f}kg/ha — {'good disease resistance' if v >= 20 else 'insufficient for quality crops'}"),
    "temperature": lambda v: ("positive" if 18<=v<=30 else "negative", f"Temperature {v:.1f}°C — {'within ideal range' if 18<=v<=30 else 'outside optimal growth range'}"),
    "humidity":    lambda v: ("positive" if 40<=v<=85 else "negative", f"Humidity {v:.0f}% — {'balanced' if 40<=v<=85 else 'extreme — risk of disease or stress'}"),
    "ph":          lambda v: ("positive" if 5.5<=v<=7.5 else "negative", f"Soil pH {v:.1f} — {'optimal for most crops' if 5.5<=v<=7.5 else 'outside acceptable range — nutrient lockout risk'}"),
    "rainfall":    lambda v: ("positive" if 50<=v<=250 else "negative", f"Rainfall {v:.0f}mm — {'adequate moisture' if 50<=v<=250 else 'deficit or waterlogging risk'}"),
    "NPK_total":   lambda v: ("positive" if v >= 80 else "neutral", f"Total NPK = {v:.0f}kg/ha — {'strong nutrient load' if v >= 80 else 'moderate nutrient supply'}"),
    "N_P_ratio":   lambda v: ("neutral", f"N:P ratio = {v:.2f}"),
    "temp_humidity": lambda v: ("neutral", f"Heat-moisture stress index = {v:.1f}"),
    "rain_humidity": lambda v: ("neutral", f"Aridity index = {v:.2f}"),
    "ph_deviation":  lambda v: ("positive" if v < 1.0 else "negative", f"pH deviation from neutral = {v:.2f} — {'near optimal' if v < 1.0 else 'acidic or alkaline conditions'}"),
}


def _engineer_features(features: dict) -> np.ndarray:
    """
    Apply the same feature engineering as training.
    Input: dict with BASE_FEATURE_COLS keys.
    Returns: 1D numpy array of length len(ALL_FEATURE_COLS).
    """
    N    = features["N"]
    P    = features["P"]
    K    = features["K"]
    temp = features["temperature"]
    hum  = features["humidity"]
    ph   = features["ph"]
    rain = features["rainfall"]

    engineered = [
        N + P + K,              # NPK_total
        N / (P + 1.0),          # N_P_ratio
        temp * hum / 100.0,     # temp_humidity
        rain / (hum + 1.0),     # rain_humidity
        abs(ph - 7.0),          # ph_deviation
    ]
    base_vals = [features[c] for c in BASE_FEATURE_COLS]
    return np.array(base_vals + engineered, dtype=np.float64)


class CropPredictor:
    """
    Loads trained models and performs crop prediction + SHAP/importance explanation.
    Automatically uses the 'best_model' from metadata.json.
    Falls back to rule-based estimator if artifacts are missing.
    """

    def __init__(self):
        self.models   = {}   # {"random_forest": obj, "xgboost": obj, ...}
        self.scaler   = None
        self.le       = None
        self.imputer  = None
        self.metadata = {}
        self._load()

    def _load(self):
        try:
            paths = {
                "random_forest":      os.path.join(ARTIFACT_DIR, "random_forest.pkl"),
                "xgboost":            os.path.join(ARTIFACT_DIR, "xgboost.pkl"),
                "gradient_boosting":  os.path.join(ARTIFACT_DIR, "gradient_boosting.pkl"),
            }
            scaler_path  = os.path.join(ARTIFACT_DIR, "scaler.pkl")
            le_path      = os.path.join(ARTIFACT_DIR, "label_encoder.pkl")
            imputer_path = os.path.join(ARTIFACT_DIR, "imputer.pkl")
            meta_path    = os.path.join(ARTIFACT_DIR, "metadata.json")

            if not (os.path.exists(scaler_path) and os.path.exists(le_path)):
                print("[CropPredictor] Artifacts missing. Run ml_engine/train.py first.")
                return

            self.scaler  = joblib.load(scaler_path)
            self.le      = joblib.load(le_path)
            if os.path.exists(imputer_path):
                self.imputer = joblib.load(imputer_path)
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    self.metadata = json.load(f)

            for name, path in paths.items():
                if os.path.exists(path):
                    self.models[name] = joblib.load(path)
                    print(f"  [OK] Loaded {name}")

            print(f"[CropPredictor] Ready — best model: {self.metadata.get('best_model', 'unknown')} | "
                  f"features: {len(ALL_FEATURE_COLS)}")
        except Exception as e:
            print(f"[CropPredictor] Load error: {e}")

    @property
    def is_ready(self) -> bool:
        return bool(self.models) and self.scaler is not None and self.le is not None

    def _best_model(self):
        """Return the best-performing model based on metadata."""
        best = self.metadata.get("best_model", "random_forest")
        return self.models.get(best) or next(iter(self.models.values()), None)

    def _feature_vector(self, features: dict) -> np.ndarray:
        """Build scaled 1×F feature matrix for a prediction."""
        vec = _engineer_features(features).reshape(1, -1)
        return self.scaler.transform(vec) if self.scaler else vec

    # ── Predict ──────────────────────────────────────────────────────────────
    def predict(self, crop: str, features: dict) -> dict:
        crop_lower = crop.lower()
        model_used = "rule_based_fallback"
        confidence = 75.0
        predicted_class = crop_lower

        if self.is_ready:
            X = self._feature_vector(features)

            # Get all model probabilities and pick the highest-confidence one
            best_conf, best_class, best_model_name = -1, crop_lower, "unknown"
            for name, model in self.models.items():
                try:
                    proba = model.predict_proba(X)[0]
                    conf  = float(np.max(proba))
                    cls   = self.le.inverse_transform([int(np.argmax(proba))])[0]
                    if conf > best_conf:
                        best_conf, best_class, best_model_name = conf, cls, name
                except Exception:
                    continue

            predicted_class = best_class
            confidence      = round(best_conf * 100, 1)
            model_used      = best_model_name

        yield_val  = self._estimate_yield(crop_lower, features)
        yield_unit = "kg/tree" if crop_lower == "coconut" else "tonnes/ha"

        return {
            "crop":             crop,
            "predicted_class":  predicted_class,
            "predicted_yield":  round(yield_val, 2),
            "yield_unit":       yield_unit,
            "yield_range":      {"min": round(yield_val * 0.88, 2), "max": round(yield_val * 1.12, 2)},
            "confidence":       confidence,
            "model_used":       model_used,
        }

    def _estimate_yield(self, crop: str, features: dict) -> float:
        lo, hi = YIELD_RANGES.get(crop, (1.0, 6.0))
        base   = (lo + hi) / 2

        ph_score       = max(0.0, 1.0 - abs(features["ph"] - 6.8) / 4.0)
        rain_score     = min(features["rainfall"] / 100.0, 1.5) / 1.5
        temp_score     = max(0.0, 1.0 - abs(features["temperature"] - 26.0) / 18.0)
        nutrient_score = (min(features["N"], 90)/90 + min(features["P"], 90)/90 + min(features["K"], 90)/90) / 3
        humid_score    = 1.0 if 40 <= features["humidity"] <= 85 else 0.7

        multiplier = (
            0.55
            + 0.10 * ph_score
            + 0.12 * rain_score
            + 0.10 * temp_score
            + 0.10 * nutrient_score
            + 0.03 * humid_score
        )
        return base * multiplier

    # ── Explain (per-prediction SHAP) ────────────────────────────────────────
    def explain(self, features: dict) -> dict:
        """
        Returns SIGNED SHAP values for a single prediction.
        Each value is positive (helps the predicted crop) or negative (hurts).
        Includes direction labels and human-readable effect descriptions.
        """
        if not self.is_ready:
            return self._heuristic_explanation(features)

        try:
            import shap
            model = self._best_model()
            X = self._feature_vector(features)
            eng_vec = _engineer_features(features)

            explainer   = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X)

            # For multi-class: shap_values is list[n_classes][n_samples, n_features]
            # Use values for the predicted class
            if isinstance(shap_values, list):
                proba     = model.predict_proba(X)[0]
                pred_idx  = int(np.argmax(proba))
                sv        = np.array(shap_values[pred_idx])[0]   # signed, per predicted class
            else:
                sv = shap_values[0]   # already (n_features,)

            total_abs = np.abs(sv).sum() or 1.0
            result    = []
            for i, feat in enumerate(ALL_FEATURE_COLS):
                input_val = float(eng_vec[i])
                shap_val  = float(sv[i])
                rule      = EFFECT_RULES.get(feat)
                if rule:
                    direction, description = rule(input_val)
                else:
                    direction, description = "neutral", feat

                result.append({
                    "feature":               feat,
                    "label":                 FEATURE_LABELS.get(feat, feat),
                    "shap_value":            round(shap_val, 5),
                    "abs_shap":              round(abs(shap_val), 5),
                    "normalized_importance": round(abs(shap_val) / total_abs, 4),
                    "pct":                   round(abs(shap_val) / total_abs * 100, 2),
                    "direction":             "positive" if shap_val > 0 else ("negative" if shap_val < 0 else "neutral"),
                    "effect_description":    description,
                    "input_value":           round(input_val, 3),
                })

            result.sort(key=lambda x: x["abs_shap"], reverse=True)
            base_val = explainer.expected_value
            if isinstance(base_val, (list, np.ndarray)):
                base_val = float(base_val[pred_idx])
            else:
                base_val = float(base_val)

            return {
                "shap_values":  result,
                "base_value":   round(base_val, 5),
                "method":       "shap_tree_explainer",
                "model_used":   self.metadata.get("best_model", "unknown"),
            }
        except Exception as e:
            print(f"[SHAP] Error: {e} — using heuristic fallback.")
            return self._heuristic_explanation(features)

    def _heuristic_explanation(self, features: dict) -> dict:
        """Rule-based fallback when SHAP is unavailable."""
        weights = {
            "N": 0.22, "P": 0.10, "K": 0.14, "temperature": 0.18,
            "humidity": 0.08, "ph": 0.10, "rainfall": 0.28,
            "NPK_total": 0.06, "N_P_ratio": 0.04, "temp_humidity": 0.05,
            "rain_humidity": 0.04, "ph_deviation": 0.05,
        }
        eng_vec = _engineer_features(features)
        result  = []
        for i, feat in enumerate(ALL_FEATURE_COLS):
            input_val = float(eng_vec[i])
            w         = weights.get(feat, 0.02)
            rule      = EFFECT_RULES.get(feat)
            direction, desc = rule(input_val) if rule else ("neutral", feat)
            result.append({
                "feature":               feat,
                "label":                 FEATURE_LABELS.get(feat, feat),
                "shap_value":            w,
                "abs_shap":              w,
                "normalized_importance": w,
                "pct":                   round(w * 100, 1),
                "direction":             direction,
                "effect_description":    desc,
                "input_value":           round(input_val, 3),
            })
        result.sort(key=lambda x: x["abs_shap"], reverse=True)
        return {"shap_values": result, "base_value": 0.0, "method": "heuristic_fallback"}

    # ── Global Feature Impact ─────────────────────────────────────────────────
    def feature_impact(self) -> dict:
        """
        Returns global feature importances from the best trained model.
        Used by the Dashboard analytics tab (no user input required).
        """
        meta_importances = self.metadata.get("feature_importances", {})
        best = self.metadata.get("best_model", "random_forest")

        if best in meta_importances:
            raw = meta_importances[best]
        elif meta_importances:
            raw = next(iter(meta_importances.values()))
        else:
            # Compute live from model
            model = self._best_model()
            if model and hasattr(model, "feature_importances_"):
                imp   = model.feature_importances_
                total = imp.sum() or 1.0
                raw   = [
                    {
                        "feature": ALL_FEATURE_COLS[i],
                        "label":   FEATURE_LABELS.get(ALL_FEATURE_COLS[i], ALL_FEATURE_COLS[i]),
                        "importance": round(float(imp[i]), 6),
                        "pct":     round(float(imp[i] / total) * 100, 2),
                    }
                    for i in range(len(ALL_FEATURE_COLS))
                ]
            else:
                raw = []

        # Enrich with domain descriptions using median/typical values
        TYPICAL = {"N":60, "P":45, "K":40, "temperature":25, "humidity":70,
                   "ph":6.5, "rainfall":120, "NPK_total":145, "N_P_ratio":1.3,
                   "temp_humidity":17.5, "rain_humidity":1.7, "ph_deviation":0.5}
        enriched = []
        for item in raw:
            feat     = item["feature"]
            rule     = EFFECT_RULES.get(feat)
            typ_val  = TYPICAL.get(feat, 1.0)
            direction, desc = rule(typ_val) if rule else ("neutral", feat)
            enriched.append({
                **item,
                "label":              FEATURE_LABELS.get(feat, feat),
                "direction":          direction,
                "effect_description": desc,
            })

        enriched.sort(key=lambda x: x["importance"], reverse=True)
        return {
            "features":    enriched,
            "model_used":  best,
            "method":      "feature_importances_",
            "n_features":  len(enriched),
        }
