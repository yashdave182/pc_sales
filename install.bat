@echo off
echo ========================================
echo Sales Management System - Installation
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Python and Node.js are installed
echo.

:: Backend Setup
echo ========================================
echo Setting up Backend (FastAPI)...
echo ========================================
cd backend

echo Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    pause
    exit /b 1
)

echo [OK] Backend setup complete!
echo.

:: Frontend Setup
cd ..\frontend

echo ========================================
echo Setting up Frontend (React + TypeScript)...
echo ========================================

echo Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo Trying with --legacy-peer-deps...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

echo [OK] Frontend setup complete!
echo.

cd ..

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo 1. Backend (Terminal 1):
echo    cd backend
echo    venv\Scripts\activate
echo    python main.py
echo.
echo 2. Frontend (Terminal 2):
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open browser: http://localhost:5173
echo.
echo For detailed instructions, see SETUP.md
echo.
pause
