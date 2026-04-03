"""
Adaptive CropShield — Model Training Script
Trains Random Forest and XGBoost classifiers on the Crop Recommendation Dataset.
Saves models, scaler, and label encoder to the artifacts/ directory.

Dataset columns: N, P, K, temperature, humidity, ph, rainfall, label
Usage:
    python train.py                                  # uses synthetic data
    python train.py --data data/Crop_recommendation.csv
"""

import os
import argparse
import numpy as np
import pandas as pd
import joblib
import json
from datetime import datetime

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET_COL   = "label"
MODEL_DIR    = os.path.join(os.path.dirname(__file__), "artifacts")


def load_data(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        print(f"[WARN] Dataset not found at {path}. Generating synthetic data for demo.")
        return _generate_synthetic_data()
    df = pd.read_csv(path)
    assert all(c in df.columns for c in FEATURE_COLS + [TARGET_COL]), \
        f"Dataset must contain columns: {FEATURE_COLS + [TARGET_COL]}"
    return df


def _generate_synthetic_data(n: int = 2200) -> pd.DataFrame:
    """
    Generate synthetic data using correct column names matching FEATURE_COLS.
    Keys: N, P, K, temperature, humidity, ph, rainfall
    """
    rng = np.random.default_rng(42)
    # Each entry: (mean, std, lo, hi)
    crops = {
        "rice":        dict(N=(60,40,20,80),   P=(45,30,5,60),   K=(40,25,10,60),   temperature=(23,2,20,27),  humidity=(80,5,70,90),  ph=(6.0,.5,5,7),    rainfall=(200,40,100,300)),
        "wheat":       dict(N=(100,25,60,130), P=(48,15,25,70),  K=(48,12,25,70),   temperature=(20,3,14,26),  humidity=(65,8,50,80),  ph=(6.5,.5,5.5,7.5),rainfall=(70,20,35,120)),
        "maize":       dict(N=(78,25,50,110),  P=(48,15,25,70),  K=(48,15,25,70),   temperature=(22,2,18,28),  humidity=(65,8,50,80),  ph=(6.2,.5,5.5,7.2),rainfall=(65,20,30,110)),
        "chickpea":    dict(N=(40,15,20,60),   P=(67,20,30,90),  K=(78,20,30,100),  temperature=(18,3,14,24),  humidity=(16,4,10,24),  ph=(7.0,.5,6,8),    rainfall=(80,20,40,130)),
        "kidneybeans": dict(N=(20,10,10,35),   P=(67,20,30,90),  K=(20,10,10,35),   temperature=(20,2,17,24),  humidity=(21,5,10,30),  ph=(5.7,.5,4.5,7),  rainfall=(105,20,60,160)),
        "pigeonpeas":  dict(N=(20,10,10,35),   P=(67,20,30,90),  K=(20,10,10,35),   temperature=(27,2,24,30),  humidity=(48,8,35,65),  ph=(5.7,.5,4.5,7.5),rainfall=(150,40,80,250)),
        "mothbeans":   dict(N=(20,10,10,35),   P=(47,15,25,70),  K=(20,10,10,35),   temperature=(28,2,24,32),  humidity=(52,8,40,65),  ph=(6.9,.5,5.5,8),  rainfall=(50,15,20,90)),
        "mungbean":    dict(N=(20,10,10,35),   P=(47,15,25,70),  K=(20,10,10,35),   temperature=(28,2,24,32),  humidity=(82,5,70,92),  ph=(6.8,.5,5.5,7.5),rainfall=(50,15,20,100)),
        "blackgram":   dict(N=(40,15,20,60),   P=(67,20,30,90),  K=(19,8,10,35),    temperature=(30,2,26,34),  humidity=(65,10,50,80), ph=(7.0,.5,6,8),    rainfall=(68,20,30,110)),
        "lentil":      dict(N=(18,8,10,30),    P=(68,20,30,90),  K=(19,8,10,35),    temperature=(25,3,18,30),  humidity=(64,10,50,78), ph=(6.9,.5,6,8),    rainfall=(45,10,20,80)),
        "pomegranate": dict(N=(18,8,10,30),    P=(18,8,10,30),   K=(40,15,25,60),   temperature=(22,3,18,27),  humidity=(90,5,82,96),  ph=(6.9,.5,6,8),    rainfall=(110,30,50,175)),
        "banana":      dict(N=(100,25,70,130), P=(82,20,50,110), K=(50,15,30,75),   temperature=(27,2,24,30),  humidity=(80,8,68,92),  ph=(6.0,.5,5,7),    rainfall=(105,30,50,175)),
        "mango":       dict(N=(20,10,10,35),   P=(27,10,12,45),  K=(30,12,15,50),   temperature=(31,2,27,36),  humidity=(50,10,35,68), ph=(5.7,.5,4.5,6.5),rainfall=(95,25,40,160)),
        "grapes":      dict(N=(23,10,10,40),   P=(132,25,90,175),K=(200,25,150,250),temperature=(23,3,18,28),  humidity=(81,8,70,92),  ph=(6.0,.5,5,7),    rainfall=(70,20,30,120)),
        "watermelon":  dict(N=(100,25,70,130), P=(14,8,5,30),    K=(50,15,30,75),   temperature=(25,2,22,30),  humidity=(85,5,75,95),  ph=(6.5,.5,6,7.5),  rainfall=(50,15,20,100)),
        "muskmelon":   dict(N=(100,25,70,130), P=(18,8,10,30),   K=(50,15,30,75),   temperature=(28,2,25,32),  humidity=(92,5,85,100), ph=(6.5,.5,6,7.5),  rainfall=(25,10,10,55)),
        "apple":       dict(N=(21,10,10,35),   P=(134,25,90,175),K=(199,25,150,250),temperature=(22,3,18,27),  humidity=(92,5,85,100), ph=(5.8,.5,5,6.5),  rainfall=(113,30,60,180)),
        "orange":      dict(N=(20,10,10,35),   P=(10,5,5,20),    K=(10,5,5,20),     temperature=(22,3,18,27),  humidity=(92,5,85,100), ph=(7.0,.5,6,8),    rainfall=(110,30,55,180)),
        "papaya":      dict(N=(50,15,30,75),   P=(59,20,25,85),  K=(50,15,30,75),   temperature=(34,2,30,39),  humidity=(92,5,85,100), ph=(6.5,.5,5.5,7.5),rainfall=(145,35,75,230)),
        "coconut":     dict(N=(22,10,10,35),   P=(17,8,8,30),    K=(30,12,15,50),   temperature=(27,2,24,31),  humidity=(94,4,87,100), ph=(5.9,.5,5,7),    rainfall=(175,40,90,280)),
        "cotton":      dict(N=(117,25,80,155), P=(46,15,25,70),  K=(19,8,10,35),    temperature=(24,3,20,29),  humidity=(79,8,65,92),  ph=(6.9,.5,6,8),    rainfall=(80,25,35,145)),
        "jute":        dict(N=(78,25,50,110),  P=(46,15,25,70),  K=(39,12,20,60),   temperature=(25,2,22,29),  humidity=(79,8,65,92),  ph=(6.8,.5,5.5,7.5),rainfall=(175,40,90,280)),
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


def preprocess(df: pd.DataFrame):
    df = df.dropna()
    X = df[FEATURE_COLS].values
    y_raw = df[TARGET_COL].values
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    return X, X_scaled, y, le, scaler


def train_models(X_scaled, y, le):
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\n[RANDOM_FOREST] Training...")
    rf = RandomForestClassifier(
        n_estimators=200, max_depth=None, min_samples_split=2,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    y_pred = rf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf, X_scaled, y, cv=cv, scoring="accuracy")
    print(f"  Test Accuracy : {acc*100:.2f}%")
    print(f"  CV Mean       : {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)

    # Try XGBoost — skip if unavailable
    xgb = None
    xgb_report = {}
    try:
        from xgboost import XGBClassifier
        print("\n[XGBOOST] Training...")
        xgb = XGBClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=6,
            use_label_encoder=False, eval_metric="mlogloss",
            random_state=42, n_jobs=-1
        )
        xgb.fit(X_train, y_train)
        xgb_pred = xgb.predict(X_test)
        xgb_acc = accuracy_score(y_test, xgb_pred)
        print(f"  Test Accuracy : {xgb_acc*100:.2f}%")
        xgb_report = {"test_accuracy": round(xgb_acc, 5)}
    except ImportError:
        print("[XGBOOST] Not installed — skipping.")
    except Exception as e:
        print(f"[XGBOOST] Error: {e} — skipping.")

    return rf, xgb, {
        "random_forest": {"test_accuracy": round(acc, 5), "cv_mean": round(cv_scores.mean(), 5), "classification_report": report},
        "xgboost": xgb_report,
    }


def save_artifacts(rf, xgb, scaler, le, reports):
    os.makedirs(MODEL_DIR, exist_ok=True)

    joblib.dump(rf, os.path.join(MODEL_DIR, "random_forest.pkl"))
    print(f"  Saved: {MODEL_DIR}/random_forest.pkl")

    if xgb is not None:
        joblib.dump(xgb, os.path.join(MODEL_DIR, "xgboost.pkl"))
        print(f"  Saved: {MODEL_DIR}/xgboost.pkl")

    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    joblib.dump(le,     os.path.join(MODEL_DIR, "label_encoder.pkl"))

    meta = {
        "trained_at":   datetime.utcnow().isoformat(),
        "feature_cols": FEATURE_COLS,
        "num_classes":  len(le.classes_),
        "classes":      le.classes_.tolist(),
        "best_model":   max(reports, key=lambda k: reports[k].get("test_accuracy", 0)),
        "model_reports": reports,
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n  Best model: {meta['best_model']} ({reports[meta['best_model']]['test_accuracy']*100:.2f}%)")
    print(f"  Metadata saved: {MODEL_DIR}/metadata.json")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/Crop_recommendation.csv")
    args = parser.parse_args()

    print("=== Adaptive CropShield — Model Training ===")
    df = load_data(args.data)
    print(f"Loaded {len(df)} records, {df[TARGET_COL].nunique()} classes.")

    X_raw, X_scaled, y, le, scaler = preprocess(df)
    rf, xgb, reports = train_models(X_scaled, y, le)
    save_artifacts(rf, xgb, scaler, le, reports)
    print("\n=== Training Complete ===")


if __name__ == "__main__":
    main()
