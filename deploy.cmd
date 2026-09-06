@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title GuestAtlas Production Deploy

echo.
echo =====================================================
echo        GuestAtlas - Production Deploy
echo =====================================================
echo.

where node >nul 2>&1 || (echo [ERROR] Node.js 22+ is required. & pause & exit /b 1)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>&1 || (echo [ERROR] Node.js 22+ is required. & pause & exit /b 1)
where npm >nul 2>&1 || (echo [ERROR] npm is required. & pause & exit /b 1)
if not exist .env.local (
  echo [ERROR] .env.local is missing.
  echo Run configure.cmd first.
  pause
  exit /b 1
)

echo [1/9] Synchronizing pinned dependencies...
if exist package-lock.json (call npm ci) else (call npm install --no-audit --no-fund)
if errorlevel 1 goto :fail

echo [2/9] Loading and validating environment...
for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
  if not "%%A"=="" if not "%%A:~0,1"=="#" set "%%A=%%B"
)
call node scripts/check-env.mjs || goto :fail
call npm run source-check || goto :fail
call npm run typecheck || goto :fail
call npm run self-test || goto :fail

echo [3/9] Building production application locally...
call npm run build || goto :fail

echo [4/9] Authenticating Supabase CLI...
call npx supabase --version || goto :fail
if "%SUPABASE_ACCESS_TOKEN%"=="" (
  call npx supabase login || goto :fail
) else (
  echo Using SUPABASE_ACCESS_TOKEN from .env.local.
)
if "%SUPABASE_PROJECT_REF%"=="" (
  set /p SUPABASE_PROJECT_REF=Enter Supabase project ref: 
)
if "%SUPABASE_PROJECT_REF%"=="" goto :fail

echo [5/9] Linking database and applying migrations...
call npx supabase link --project-ref "%SUPABASE_PROJECT_REF%" || goto :fail
call npx supabase db push || goto :fail

echo [6/9] Verifying deployed database schema...
call npm run verify || goto :fail

echo [7/9] Linking Vercel project...
if "%VERCEL_TOKEN%"=="" (
  call npx vercel@59.11.7 link --yes || goto :fail
) else (
  call npx vercel@59.11.7 link --yes --token "%VERCEL_TOKEN%" || goto :fail
)

echo [8/9] Synchronizing Vercel production environment...
call node scripts/sync-vercel-env.mjs || goto :fail

echo [9/9] Deploying web application to Vercel production...
if "%VERCEL_TOKEN%"=="" (
  call npx vercel@59.11.7 deploy --prod || goto :fail
) else (
  call npx vercel@59.11.7 deploy --prod --token "%VERCEL_TOKEN%" || goto :fail
)

echo.
echo =====================================================
echo DEPLOYMENT COMPLETED
echo.
echo Final launch step: set the Supabase Auth Site URL to NEXT_PUBLIC_APP_URL
echo and allow NEXT_PUBLIC_APP_URL/auth/confirm as a redirect URL.
echo Then sign up, enroll TOTP MFA, promote the bootstrap admin,
echo and verify the first property from /platform.
echo =====================================================
pause
exit /b 0

:fail
echo.
echo [FAILED] Deployment stopped. Read the error above; nothing after that step was executed.
pause
exit /b 1
