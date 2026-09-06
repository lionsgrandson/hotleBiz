@echo off
setlocal
cd /d "%~dp0"
title GuestAtlas Local Setup

where node >nul 2>&1 || (echo Node.js 22+ required.&pause&exit /b 1)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>&1 || (echo Node.js 22+ required.&pause&exit /b 1)
where npm >nul 2>&1 || (echo npm required.&pause&exit /b 1)

if not exist .env.local call configure.cmd
if not exist .env.local exit /b 1

if exist package-lock.json (call npm ci --no-audit --no-fund) else (call npm install --no-audit --no-fund)
if errorlevel 1 exit /b 1

call npm run source-check || exit /b 1
call npm run typecheck || exit /b 1
call npm run self-test || exit /b 1

echo.
echo Setup complete.
echo   Fast development: npm run dev
echo   Cloudflare runtime preview: npm run cf:preview
echo   Full production release: GO-LIVE.cmd
echo.
echo The normal dev server uses OpenNext's Cloudflare development integration,
echo so the local R2 binding is available without changing application code.
pause
