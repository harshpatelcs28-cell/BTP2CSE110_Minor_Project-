#!/bin/bash
echo "========================================"
echo "Adaptive CropShield Environment Setup"
echo "========================================"
echo ""

echo "[1/3] Installing Frontend Dependencies..."
cd frontend
npm install
cd ..
echo ""

echo "[2/3] Installing Backend Dependencies..."
cd backend
npm install
cd ..
echo ""

echo "[3/3] Installing ML Engine Dependencies..."
pip install -r requirements.txt || pip3 install -r requirements.txt
echo ""

echo "========================================"
echo "Setup Complete! You can now run bash start.sh"
echo "========================================"
