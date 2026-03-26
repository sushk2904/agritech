@echo off
REM Start Backend Server
REM Prerequisites: Java 21, Maven 3.8+

cd /d "%~dp0\agritech\backend"

REM Check if JAR exists, if not build it
if not exist "target\backend-0.0.1-SNAPSHOT.jar" (
    echo Building backend...
    mvn clean package -DskipTests
    if errorlevel 1 (
        echo Build failed! Check Maven installation.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Starting Backend Server...
echo ========================================
echo.
echo Backend will run on: http://localhost:8080
echo.

java -jar target\backend-0.0.1-SNAPSHOT.jar

pause
