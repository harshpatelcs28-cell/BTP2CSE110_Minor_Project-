@echo off
echo ========================================
echo Adaptive CropShield Environment Setup
echo ========================================
echo.

echo [1/3] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..
echo.

echo [2/3] Installing Backend Dependencies...
cd backend
call npm install
cd ..
echo.

echo [3/3] Installing ML Engine Dependencies...
call pip install -r requirements.txt
echo.

echo ========================================
echo Setup Complete! You can now run start.bat
echo ========================================
pause
