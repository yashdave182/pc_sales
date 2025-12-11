@echo off
echo ========================================
echo  Sales Management System - Quick Start
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Python and Node.js are installed
echo.

REM Check if backend virtual environment exists
if not exist "backend\venv\" (
    echo [SETUP] Creating Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    echo [SETUP] Installing backend dependencies...
    pip install -r requirements.txt
    cd ..
    echo [OK] Backend setup complete
    echo.
) else (
    echo [OK] Backend virtual environment exists
    echo.
)

REM Check if frontend node_modules exists
if not exist "frontend\node_modules\" (
    echo [SETUP] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend setup complete
    echo.
) else (
    echo [OK] Frontend dependencies installed
    echo.
)

REM Check if database exists
set DB_PATH=..\sales_management.db
if not exist "%DB_PATH%" (
    echo [WARNING] Database not found at: %DB_PATH%
    echo Please ensure sales_management.db is in the parent directory
    echo.
)

echo ========================================
echo  Starting Services...
echo ========================================
echo.
echo [INFO] Starting Backend Server (FastAPI)...
echo [INFO] Starting Frontend Server (React + Vite)...
echo.
echo Press Ctrl+C in both windows to stop the servers
echo.

REM Start backend in new window
start "Sales Management - Backend API" cmd /k "cd backend && venv\Scripts\activate && python main.py"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Sales Management - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo  Services Started!
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo API Docs:    http://localhost:8000/docs
echo Frontend:    http://localhost:5173
echo.
echo Your browser should open automatically in a few seconds...
echo.

REM Wait 5 seconds for services to fully start
timeout /t 5 /nobreak >nul

REM Open browser
start http://localhost:5173

echo.
echo [SUCCESS] Sales Management System is running!
echo.
echo To stop the application:
echo 1. Close both terminal windows, or
echo 2. Press Ctrl+C in each window
echo.
pause
