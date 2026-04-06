@echo off
echo Starting Adaptive CropShield...
setlocal

:: Auto-run setup if dependencies are missing
if not exist "frontend\node_modules\" (
    echo [!] First time run detected. Installing dependencies automatically...
    call setup.bat
)

:: Start Python ML Service
echo [1/3] Starting ML Engine on port 5001...
cd ml_engine
start "CropShield ML Engine" cmd /c "python ml_service.py"
cd ..

:: Start Node Backend
echo [2/3] Starting Node API on port 5000...
cd backend
start "CropShield Node API" cmd /c "node server.js"
cd ..

:: Start React Frontend
echo [3/3] Starting React UI...
cd frontend
start "CropShield Web App" cmd /c "npm run dev"
cd ..

echo Boot sequence complete! Adaptive CropShield UI should spin up shortly.
endlocal
