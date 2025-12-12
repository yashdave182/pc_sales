@echo off
echo ========================================
echo  Committing and Pushing Changes
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking git status...
git status
echo.

echo [2/3] Committing changes...
git commit -m "Fix production deployment: Add Render config and deployment guide"
echo.

echo [3/3] Pushing to GitHub...
git push origin main
echo.

echo ========================================
echo  Done!
echo ========================================
pause
