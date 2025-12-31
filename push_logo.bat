@echo off
echo ========================================
echo  Pushing Logo Changes
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Adding changes...
git add frontend/public/logo.jpg
git add frontend/src/components/Layout.tsx
echo.

echo [2/4] Checking status...
git status
echo.

echo [3/4] Committing changes...
git commit -m "Add company logo to sidebar navigation"
echo.

echo [4/4] Pushing to GitHub...
git push origin main
echo.

echo ========================================
echo  Done!
echo ========================================
pause
