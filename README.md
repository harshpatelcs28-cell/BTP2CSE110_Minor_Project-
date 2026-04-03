# 🌱 Adaptive CropShield

**The intelligent software engine designed to maximize agricultural productivity. Leverage real-time analytics and dynamic modeling to consistently generate higher crop yields.**

![Adaptive CropShield Dashboard](https://raw.githubusercontent.com/harshpatelcs28-cell/BTP2CSE110_Minor_Project-/main/hero-preview.png) *(Preview placeholder)*

## 🚀 Architecture stack

Adaptive CropShield is a 3-tier decoupled architecture:
1. **Frontend**: Custom interactive React (Vite) Single Page Application styled identically to premium modern design trends using TailwindCSS.
2. **Backend**: A hyper-fast purely asynchronous Express/Node.js REST API securing data flow.
3. **ML Engine**: A raw Python-Flask microservice running active `XGBoost` and `RandomForest` machine learning classifiers wrapped with SHAP explainable mathematics.

## 🛠 Features Unpacked
- **Real-time Engine Routing**: Independent Node.js polling against free tier `Open-Meteo` pulls geolocation telemetry dynamically piping local climate metrics to the Python ML layer entirely bypassing static thresholds.
- **Rule-based Failsafes**: Built-in backend fault tolerance smoothly proxies Python `connection_refused` into localized analytical algorithms, ensuring dashboard uptime even when internal machine learning modules reboot.
- **Forecasts & Threat Counters**: Recommends mathematically derived actionable countermeasures (irrigation, fertilization tweaks) to maximize yield against rolling 4-day environmental trajectories.

## ⚙️ Installation & Running Locally

Adaptive CropShield has been designed for 1-click startup without wrestling multiple terminals.

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)

### 2. Dependency Setup
You must install the ecosystem dependencies before running:

```bash
# Setup Frontend UI
cd frontend
npm install
cd ..

# Setup Backend API
cd backend
npm install
cd ..

# Setup Python ML Engine
pip install -r requirements.txt
```

### 3. Execution Standard (The Easy Way)
For **Windows**: Just double click or securely run `start.bat`.
For **Unix/Mac**: Execute `bash start.sh`

*These scripts instantly bind your ecosystem:*
- React UI spins up securely on `http://localhost:5173`
- Node API proxies securely through port `5000`.
- Python ML listens for tensor calculations natively on port `5001`.

## 💾 Environmental Configurations
The system works locally entirely without `.env` injections automatically! 
If you plan to scale, rename `.env.example` to `.env` directly in your workspace.

```ini
FLASK_ENV=development
PORT=5000
ML_SERVICE_URL=http://localhost:5001
VITE_API_URL=http://localhost:5000
```
