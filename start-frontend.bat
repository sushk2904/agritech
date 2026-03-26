@echo off
REM Start Frontend Server
REM Prerequisites: Node.js 18+, npm

cd /d "%~dp0\agritech\frontend"

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Installation failed! Check Node.js installation.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Starting Frontend Server...
echo ========================================
echo.
echo Frontend will run on: http://localhost:3000
echo.

call npm run dev

pause
