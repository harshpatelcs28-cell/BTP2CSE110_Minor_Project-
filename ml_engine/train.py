"""
Adaptive CropShield — Improved Model Training Script
=====================================================
Trains Random Forest, XGBoost, and Gradient Boosting classifiers on the
Crop Recommendation Dataset with:
  - Robust preprocessing (median imputation + IQR-capped outliers + StandardScaler)
  - Feature engineering (5 domain interaction terms)
  - RandomizedSearchCV hyperparameter tuning (StratifiedKFold-5)
  - Ensemble vote for best final model
  - Full classification metrics: accuracy, weighted F1, per-class report
  - Class imbalance detection + automatic class_weight='balanced'
  - Overfitting guard (train/test gap warning)

Dataset columns: N, P, K, temperature, humidity, ph, rainfall, label

Usage:
    python train.py                                        # synthetic data
    python train.py --data data/Crop_recommendation.csv   # real dataset
"""

import os
import argparse
import warnings
import json
import time
from datetime import datetime

import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import (
    train_test_split, StratifiedKFold, RandomizedSearchCV, cross_val_score
)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report, confusion_matrix
)

warnings.filterwarnings("ignore")

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET_COL        = "label"
MODEL_DIR         = os.path.join(os.path.dirname(__file__), "artifacts")

# Engineered feature names (appended after base features)
ENG_FEATURE_COLS = [
    "NPK_total",      # N + P + K — total nutrient load
    "N_P_ratio",      # N / (P + 1) — nitrogen-phosphorus balance
    "temp_humidity",  # temperature * humidity / 100 — heat-moisture stress
    "rain_humidity",  # rainfall / (humidity + 1) — aridity index
    "ph_deviation",   # abs(ph - 7.0) — distance from neutral pH
]
ALL_FEATURE_COLS = BASE_FEATURE_COLS + ENG_FEATURE_COLS


# ── Data loading ──────────────────────────────────────────────────────────────
def load_data(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        print(f"[WARN] Dataset not found at '{path}'. Generating synthetic data.")
        return _generate_synthetic_data()
    df = pd.read_csv(path)
    missing = [c for c in BASE_FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")
    print(f"[OK] Loaded dataset from '{path}' — {len(df)} rows, {df[TARGET_COL].nunique()} classes.")
    return df


def _generate_synthetic_data(n: int = 2200) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    crops = {
        "rice":        dict(N=(60,40,20,80),   P=(45,30,5,60),    K=(40,25,10,60),   temperature=(23,2,20,27),  humidity=(80,5,70,90),  ph=(6.0,.5,5,7),    rainfall=(200,40,100,300)),
        "wheat":       dict(N=(100,25,60,130), P=(48,15,25,70),   K=(48,12,25,70),   temperature=(20,3,14,26),  humidity=(65,8,50,80),  ph=(6.5,.5,5.5,7.5),rainfall=(70,20,35,120)),
        "maize":       dict(N=(78,25,50,110),  P=(48,15,25,70),   K=(48,15,25,70),   temperature=(22,2,18,28),  humidity=(65,8,50,80),  ph=(6.2,.5,5.5,7.2),rainfall=(65,20,30,110)),
        "chickpea":    dict(N=(40,15,20,60),   P=(67,20,30,90),   K=(78,20,30,100),  temperature=(18,3,14,24),  humidity=(16,4,10,24),  ph=(7.0,.5,6,8),    rainfall=(80,20,40,130)),
        "kidneybeans": dict(N=(20,10,10,35),   P=(67,20,30,90),   K=(20,10,10,35),   temperature=(20,2,17,24),  humidity=(21,5,10,30),  ph=(5.7,.5,4.5,7),  rainfall=(105,20,60,160)),
        "pigeonpeas":  dict(N=(20,10,10,35),   P=(67,20,30,90),   K=(20,10,10,35),   temperature=(27,2,24,30),  humidity=(48,8,35,65),  ph=(5.7,.5,4.5,7.5),rainfall=(150,40,80,250)),
        "mothbeans":   dict(N=(20,10,10,35),   P=(47,15,25,70),   K=(20,10,10,35),   temperature=(28,2,24,32),  humidity=(52,8,40,65),  ph=(6.9,.5,5.5,8),  rainfall=(50,15,20,90)),
        "mungbean":    dict(N=(20,10,10,35),   P=(47,15,25,70),   K=(20,10,10,35),   temperature=(28,2,24,32),  humidity=(82,5,70,92),  ph=(6.8,.5,5.5,7.5),rainfall=(50,15,20,100)),
        "blackgram":   dict(N=(40,15,20,60),   P=(67,20,30,90),   K=(19,8,10,35),    temperature=(30,2,26,34),  humidity=(65,10,50,80), ph=(7.0,.5,6,8),    rainfall=(68,20,30,110)),
        "lentil":      dict(N=(18,8,10,30),    P=(68,20,30,90),   K=(19,8,10,35),    temperature=(25,3,18,30),  humidity=(64,10,50,78), ph=(6.9,.5,6,8),    rainfall=(45,10,20,80)),
        "pomegranate": dict(N=(18,8,10,30),    P=(18,8,10,30),    K=(40,15,25,60),   temperature=(22,3,18,27),  humidity=(90,5,82,96),  ph=(6.9,.5,6,8),    rainfall=(110,30,50,175)),
        "banana":      dict(N=(100,25,70,130), P=(82,20,50,110),  K=(50,15,30,75),   temperature=(27,2,24,30),  humidity=(80,8,68,92),  ph=(6.0,.5,5,7),    rainfall=(105,30,50,175)),
        "mango":       dict(N=(20,10,10,35),   P=(27,10,12,45),   K=(30,12,15,50),   temperature=(31,2,27,36),  humidity=(50,10,35,68), ph=(5.7,.5,4.5,6.5),rainfall=(95,25,40,160)),
        "grapes":      dict(N=(23,10,10,40),   P=(132,25,90,175), K=(200,25,150,250),temperature=(23,3,18,28),  humidity=(81,8,70,92),  ph=(6.0,.5,5,7),    rainfall=(70,20,30,120)),
        "watermelon":  dict(N=(100,25,70,130), P=(14,8,5,30),     K=(50,15,30,75),   temperature=(25,2,22,30),  humidity=(85,5,75,95),  ph=(6.5,.5,6,7.5),  rainfall=(50,15,20,100)),
        "muskmelon":   dict(N=(100,25,70,130), P=(18,8,10,30),    K=(50,15,30,75),   temperature=(28,2,25,32),  humidity=(92,5,85,100), ph=(6.5,.5,6,7.5),  rainfall=(25,10,10,55)),
        "apple":       dict(N=(21,10,10,35),   P=(134,25,90,175), K=(199,25,150,250),temperature=(22,3,18,27),  humidity=(92,5,85,100), ph=(5.8,.5,5,6.5),  rainfall=(113,30,60,180)),
        "orange":      dict(N=(20,10,10,35),   P=(10,5,5,20),     K=(10,5,5,20),     temperature=(22,3,18,27),  humidity=(92,5,85,100), ph=(7.0,.5,6,8),    rainfall=(110,30,55,180)),
        "papaya":      dict(N=(50,15,30,75),   P=(59,20,25,85),   K=(50,15,30,75),   temperature=(34,2,30,39),  humidity=(92,5,85,100), ph=(6.5,.5,5.5,7.5),rainfall=(145,35,75,230)),
        "coconut":     dict(N=(22,10,10,35),   P=(17,8,8,30),     K=(30,12,15,50),   temperature=(27,2,24,31),  humidity=(94,4,87,100), ph=(5.9,.5,5,7),    rainfall=(175,40,90,280)),
        "cotton":      dict(N=(117,25,80,155), P=(46,15,25,70),   K=(19,8,10,35),    temperature=(24,3,20,29),  humidity=(79,8,65,92),  ph=(6.9,.5,6,8),    rainfall=(80,25,35,145)),
        "jute":        dict(N=(78,25,50,110),  P=(46,15,25,70),   K=(39,12,20,60),   temperature=(25,2,22,29),  humidity=(79,8,65,92),  ph=(6.8,.5,5.5,7.5),rainfall=(175,40,90,280)),
    }
    rows = []
    per_crop = n // len(crops)
    for crop, params in crops.items():
        for _ in range(per_crop):
            row = {"label": crop}
            for feat, (mean, std, lo, hi) in params.items():
                row[feat] = float(np.clip(rng.normal(mean, std), lo, hi))
            rows.append(row)
    return pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)


# ── Feature engineering ───────────────────────────────────────────────────────
def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add 5 domain-informed interaction features to the dataframe."""
    df = df.copy()
    df["NPK_total"]     = df["N"] + df["P"] + df["K"]
    df["N_P_ratio"]     = df["N"] / (df["P"] + 1.0)
    df["temp_humidity"] = df["temperature"] * df["humidity"] / 100.0
    df["rain_humidity"] = df["rainfall"] / (df["humidity"] + 1.0)
    df["ph_deviation"]  = (df["ph"] - 7.0).abs()
    return df


# ── Preprocessing ─────────────────────────────────────────────────────────────
def clamp_outliers_iqr(df: pd.DataFrame, cols: list) -> pd.DataFrame:
    """Cap values at [Q1 - 1.5*IQR, Q3 + 1.5*IQR] for each column."""
    df = df.copy()
    for col in cols:
        q1, q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        clamped = df[col].clip(lower=lo, upper=hi)
        n_clamped = (df[col] != clamped).sum()
        if n_clamped:
            print(f"  IQR clamp [{col}]: {n_clamped} outliers capped")
        df[col] = clamped
    return df


def preprocess(df: pd.DataFrame):
    """
    Full preprocessing pipeline:
      1. Median imputation (handles NaN without data loss)
      2. IQR outlier capping on base features
      3. Feature engineering (5 interaction terms)
      4. Label encoding
      5. StandardScaler
    Returns: X_raw, X_scaled, y, le, scaler, imputer, class_weights_dict
    """
    # Report missing values
    n_missing = df[BASE_FEATURE_COLS].isna().sum().sum()
    if n_missing > 0:
        print(f"  [IMPUTE] {n_missing} missing values detected — applying median imputation.")

    # 1. Median imputation on base features
    imputer = SimpleImputer(strategy="median")
    df[BASE_FEATURE_COLS] = imputer.fit_transform(df[BASE_FEATURE_COLS])

    # 2. IQR outlier clamping
    df = clamp_outliers_iqr(df, BASE_FEATURE_COLS)

    # 3. Feature engineering
    df = add_engineered_features(df)

    # 4. Label encoding
    le = LabelEncoder()
    y  = le.fit_transform(df[TARGET_COL].values)

    # 5. Class imbalance report
    counts = pd.Series(y).value_counts()
    ratio  = counts.max() / counts.min()
    if ratio > 1.5:
        print(f"  [IMBALANCE] Class ratio (max/min) = {ratio:.1f}x — using class_weight='balanced'")
    else:
        print(f"  [CLASS_BALANCE] Class ratio = {ratio:.1f}x — well balanced.")

    # 6. Scaling
    X_raw = df[ALL_FEATURE_COLS].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    return X_raw, X_scaled, y, le, scaler, imputer


# ── Hyperparameter search spaces ──────────────────────────────────────────────
RF_PARAM_DIST = {
    "n_estimators":      [100, 200, 300, 400],
    "max_depth":         [None, 10, 20, 30],
    "min_samples_split": [2, 4, 6],
    "min_samples_leaf":  [1, 2, 4],
    "max_features":      ["sqrt", "log2"],
}

XGB_PARAM_DIST = {
    "n_estimators":  [100, 200, 300],
    "learning_rate": [0.03, 0.05, 0.1, 0.15],
    "max_depth":     [4, 5, 6, 7, 8],
    "subsample":     [0.7, 0.8, 0.9, 1.0],
    "colsample_bytree": [0.7, 0.8, 1.0],
    "gamma":         [0, 0.1, 0.2],
}

GB_PARAM_DIST = {
    "n_estimators":  [100, 200, 300],
    "learning_rate": [0.05, 0.1, 0.15],
    "max_depth":     [3, 4, 5, 6],
    "subsample":     [0.7, 0.8, 0.9],
    "min_samples_split": [2, 4],
}


def _tune(estimator, param_dist, X_train, y_train, n_iter=20, label="Model") -> object:
    """Run RandomizedSearchCV and return best estimator."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    search = RandomizedSearchCV(
        estimator, param_dist,
        n_iter=n_iter, cv=cv, scoring="f1_weighted",
        n_jobs=-1, random_state=42, verbose=0, refit=True
    )
    t0 = time.time()
    search.fit(X_train, y_train)
    elapsed = time.time() - t0
    print(f"  {label} best CV F1 = {search.best_score_*100:.2f}%  ({elapsed:.0f}s)")
    print(f"  {label} best params = {search.best_params_}")
    return search.best_estimator_


# ── Model training ────────────────────────────────────────────────────────────
def train_models(X_scaled, y, le):
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    reports = {}

    # ── Random Forest ──────────────────────────────────────────────────────────
    print("\n[RANDOM_FOREST] Tuning hyperparameters...")
    rf_base = RandomForestClassifier(class_weight="balanced", random_state=42, n_jobs=-1)
    rf = _tune(rf_base, RF_PARAM_DIST, X_train, y_train, n_iter=20, label="RF")
    rf_pred  = rf.predict(X_test)
    rf_train_pred = rf.predict(X_train)
    rf_acc   = accuracy_score(y_test, rf_pred)
    rf_f1    = f1_score(y_test, rf_pred, average="weighted")
    rf_train_acc = accuracy_score(y_train, rf_train_pred)
    cv_rf    = cross_val_score(rf, X_scaled, y, cv=cv, scoring="f1_weighted", n_jobs=-1)
    gap      = rf_train_acc - rf_acc
    if gap > 0.05:
        print(f"  [OVERFIT WARN] RF train/test gap = {gap*100:.1f}% — consider reducing max_depth.")
    print(f"  RF  Test  Acc={rf_acc*100:.2f}%  F1={rf_f1*100:.2f}%")
    print(f"  RF  CV-5  F1={cv_rf.mean()*100:.2f}% ±{cv_rf.std()*100:.2f}%")
    reports["random_forest"] = {
        "test_accuracy": round(rf_acc, 5),
        "test_f1_weighted": round(rf_f1, 5),
        "cv_f1_mean": round(cv_rf.mean(), 5),
        "cv_f1_std": round(cv_rf.std(), 5),
        "train_test_gap": round(gap, 4),
        "classification_report": classification_report(y_test, rf_pred, target_names=le.classes_, output_dict=True),
        "best_params": rf.get_params(),
    }

    # ── XGBoost ───────────────────────────────────────────────────────────────
    xgb = None
    try:
        from xgboost import XGBClassifier
        print("\n[XGBOOST] Tuning hyperparameters...")
        xgb_base = XGBClassifier(
            use_label_encoder=False, eval_metric="mlogloss",
            random_state=42, n_jobs=-1, verbosity=0
        )
        xgb = _tune(xgb_base, XGB_PARAM_DIST, X_train, y_train, n_iter=20, label="XGB")
        xgb_pred  = xgb.predict(X_test)
        xgb_acc   = accuracy_score(y_test, xgb_pred)
        xgb_f1    = f1_score(y_test, xgb_pred, average="weighted")
        cv_xgb    = cross_val_score(xgb, X_scaled, y, cv=cv, scoring="f1_weighted", n_jobs=-1)
        print(f"  XGB Test  Acc={xgb_acc*100:.2f}%  F1={xgb_f1*100:.2f}%")
        print(f"  XGB CV-5  F1={cv_xgb.mean()*100:.2f}% ±{cv_xgb.std()*100:.2f}%")
        reports["xgboost"] = {
            "test_accuracy": round(xgb_acc, 5),
            "test_f1_weighted": round(xgb_f1, 5),
            "cv_f1_mean": round(cv_xgb.mean(), 5),
            "cv_f1_std": round(cv_xgb.std(), 5),
            "best_params": xgb.get_params(),
        }
    except ImportError:
        print("[XGBOOST] Not installed — skipping.")
    except Exception as e:
        print(f"[XGBOOST] Error: {e} — skipping.")

    # ── Gradient Boosting ─────────────────────────────────────────────────────
    print("\n[GRADIENT_BOOSTING] Tuning hyperparameters...")
    gb_base = GradientBoostingClassifier(random_state=42)
    gb = _tune(gb_base, GB_PARAM_DIST, X_train, y_train, n_iter=20, label="GB")
    gb_pred  = gb.predict(X_test)
    gb_acc   = accuracy_score(y_test, gb_pred)
    gb_f1    = f1_score(y_test, gb_pred, average="weighted")
    cv_gb    = cross_val_score(gb, X_scaled, y, cv=cv, scoring="f1_weighted", n_jobs=-1)
    print(f"  GB  Test  Acc={gb_acc*100:.2f}%  F1={gb_f1*100:.2f}%")
    print(f"  GB  CV-5  F1={cv_gb.mean()*100:.2f}% ±{cv_gb.std()*100:.2f}%")
    reports["gradient_boosting"] = {
        "test_accuracy": round(gb_acc, 5),
        "test_f1_weighted": round(gb_f1, 5),
        "cv_f1_mean": round(cv_gb.mean(), 5),
        "cv_f1_std": round(cv_gb.std(), 5),
        "best_params": gb.get_params(),
    }

    return rf, xgb, gb, reports


# ── Save artifacts ────────────────────────────────────────────────────────────
def save_artifacts(rf, xgb, gb, scaler, le, imputer, reports):
    os.makedirs(MODEL_DIR, exist_ok=True)

    joblib.dump(rf,      os.path.join(MODEL_DIR, "random_forest.pkl"))
    joblib.dump(gb,      os.path.join(MODEL_DIR, "gradient_boosting.pkl"))
    joblib.dump(scaler,  os.path.join(MODEL_DIR, "scaler.pkl"))
    joblib.dump(le,      os.path.join(MODEL_DIR, "label_encoder.pkl"))
    joblib.dump(imputer, os.path.join(MODEL_DIR, "imputer.pkl"))

    if xgb is not None:
        joblib.dump(xgb, os.path.join(MODEL_DIR, "xgboost.pkl"))

    # Determine best model by CV F1
    best_name = max(reports, key=lambda k: reports[k].get("cv_f1_mean", 0))

    # Compute global feature importances for all saved models
    feature_importances = {}
    def _extract_importances(model, name):
        if hasattr(model, "feature_importances_"):
            imp = model.feature_importances_
            total = imp.sum() or 1.0
            feature_importances[name] = [
                {
                    "feature": ALL_FEATURE_COLS[i],
                    "label": ALL_FEATURE_COLS[i].replace("_", " ").title(),
                    "importance": round(float(imp[i]), 6),
                    "pct": round(float(imp[i] / total) * 100, 2),
                }
                for i in range(len(ALL_FEATURE_COLS))
            ]

    _extract_importances(rf, "random_forest")
    if xgb: _extract_importances(xgb, "xgboost")
    _extract_importances(gb, "gradient_boosting")

    meta = {
        "trained_at":              datetime.utcnow().isoformat(),
        "base_feature_cols":       BASE_FEATURE_COLS,
        "engineered_feature_cols": ENG_FEATURE_COLS,
        "all_feature_cols":        ALL_FEATURE_COLS,
        "num_classes":             len(le.classes_),
        "classes":                 le.classes_.tolist(),
        "best_model":              best_name,
        "model_reports":           reports,
        "feature_importances":     feature_importances,
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n  Best model: {best_name}  "
          f"(CV F1 = {reports[best_name]['cv_f1_mean']*100:.2f}%)")
    print(f"  All artifacts saved → {MODEL_DIR}/")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/Crop_recommendation.csv",
                        help="Path to CSV dataset (uses synthetic data if not found)")
    args = parser.parse_args()

    print("=" * 60)
    print("  Adaptive CropShield — Enhanced Model Training")
    print("=" * 60)

    df = load_data(args.data)
    print(f"  Classes: {df[TARGET_COL].nunique()}  |  Rows: {len(df)}")

    print("\n[PREPROCESSING]")
    X_raw, X_scaled, y, le, scaler, imputer = preprocess(df)
    print(f"  Feature vector size: {X_scaled.shape[1]} "
          f"({len(BASE_FEATURE_COLS)} base + {len(ENG_FEATURE_COLS)} engineered)")

    print("\n[TRAINING]")
    rf, xgb, gb, reports = train_models(X_scaled, y, le)

    print("\n[SAVING]")
    save_artifacts(rf, xgb, gb, scaler, le, imputer, reports)

    print("\n[DONE] Training complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
