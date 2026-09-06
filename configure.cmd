@echo off
setlocal
cd /d "%~dp0"
title GuestAtlas Configuration
where node >nul 2>&1 || (echo [ERROR] Node.js 22+ is required. & pause & exit /b 1)
node scripts\configure.mjs
if errorlevel 1 (
  echo.
  echo [FAILED] Configuration was not completed.
  pause
  exit /b 1
)
echo.
pause
