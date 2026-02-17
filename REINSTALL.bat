@echo off
echo ========================================
echo   TechTree Studio - Clean Reinstall
echo ========================================
echo.

echo Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    pause
    exit /b 1
)

echo Removing node_modules...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo node_modules removed.
) else (
    echo node_modules not found.
)

echo Removing package-lock.json...
if exist "package-lock.json" (
    del /q "package-lock.json"
    echo package-lock.json removed.
) else (
    echo package-lock.json not found.
)

echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Reinstall Complete!
echo ========================================
echo.
echo Run BUILD.bat or OPEN.bat to build.
echo.
pause
