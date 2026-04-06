#!/bin/bash
echo "Starting Adaptive CropShield..."

# Auto-run setup if dependencies are missing
if [ ! -d "frontend/node_modules" ]; then
    echo "[!] First time run detected. Installing dependencies automatically..."
    bash setup.sh
fi

# Start Python ML Service in background
echo "[1/3] Starting ML Engine on port 5001..."
cd ml_engine
python3 ml_service.py &
ML_PID=$!
cd ..

# Start Node Backend in background
echo "[2/3] Starting Node API on port 5000..."
cd backend
node server.js &
NODE_PID=$!
cd ..

# Start React Frontend in background
echo "[3/3] Starting React UI..."
cd frontend
npm run dev &
VITE_PID=$!
cd ..

echo "Boot sequence complete!"
echo "Press Ctrl+C to stop all services."

# Wait for process halts and kill all children
trap "kill $ML_PID $NODE_PID $VITE_PID; exit" SIGINT SIGTERM
wait
