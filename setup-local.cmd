@echo off
setlocal
cd /d "%~dp0"
title GuestAtlas Local Setup
where node >nul 2>&1 || (echo Node.js 22+ required.&pause&exit /b 1)
if not exist .env.local call configure.cmd
if not exist .env.local exit /b 1
if exist package-lock.json (call npm ci) else (call npm install)
if errorlevel 1 exit /b 1
call npx supabase --version || exit /b 1
echo.
echo If Docker Desktop is running, the next command starts a local Supabase stack.
call npx supabase start
if errorlevel 1 echo Local Supabase did not start. You can still use a hosted Supabase project from .env.local.
echo.
echo Setup complete. Run: npm run dev
pause
