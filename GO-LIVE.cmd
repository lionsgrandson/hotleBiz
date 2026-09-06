@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title GuestAtlas - Install, Push and Cloudflare Deploy

set "CF_SECRETS=.cloudflare.secrets.tmp.json"
set "MAINT_SECRETS=.maintenance.secrets.tmp.json"

echo.
echo =============================================================
echo      GuestAtlas - FULL INSTALL + PUSH + CLOUDFLARE DEPLOY
echo =============================================================
echo.

where node >nul 2>&1 || (echo [ERROR] Node.js 22+ is required. & goto :fail)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>&1 || (echo [ERROR] Node.js 22+ is required. & goto :fail)
where npm >nul 2>&1 || (echo [ERROR] npm is required. & goto :fail)
where git >nul 2>&1 || (echo [ERROR] Git is required because this script also pushes the reviewed source. & goto :fail)

if not exist .env.local (
  echo [SETUP] .env.local is missing. Starting configuration wizard...
  call configure.cmd || goto :fail
)
if not exist .env.local (echo [ERROR] Configuration did not create .env.local. & goto :fail)

for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
  if not "%%A"=="" if not "%%A:~0,1"=="#" set "%%A=%%B"
)

echo [1/15] Installing exact project dependencies...
if exist package-lock.json (
  call npm ci --no-audit --no-fund || goto :fail
) else (
  call npm install --no-audit --no-fund || goto :fail
)

echo [2/15] Validating environment and source integrity...
call node scripts/check-env.mjs || goto :fail
call npm run source-check || goto :fail

echo [3/15] Typechecking application...
call npm run typecheck || goto :fail

echo [4/15] Running scoring, encryption and matching self-tests...
call npm run self-test || goto :fail

echo [5/15] Authenticating Cloudflare Wrangler...
call npx wrangler whoami >nul 2>&1
if errorlevel 1 (
  if defined CLOUDFLARE_API_TOKEN (
    echo [ERROR] CLOUDFLARE_API_TOKEN was provided but Wrangler authentication failed.
    goto :fail
  )
  echo Opening Cloudflare login...
  call npx wrangler login || goto :fail
  call npx wrangler whoami || goto :fail
)

echo [6/15] Ensuring private R2 evidence bucket exists...
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul
if errorlevel 1 (
  call npx wrangler r2 bucket create guestatlas-evidence || goto :fail
)
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul || (echo [ERROR] guestatlas-evidence R2 bucket was not found after provisioning. & goto :fail)
del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1

echo [7/15] Building the Next.js application for Cloudflare Workers...
call npm run cf:build || goto :fail

echo [8/15] Running Wrangler production bundle dry-run...
if exist .cloudflare-dry-run rmdir /s /q .cloudflare-dry-run
call npx wrangler deploy --dry-run --outdir .cloudflare-dry-run || goto :fail

echo [9/15] Committing and pushing the exact validated source to GitHub main...
call git add -A || goto :fail
call git diff --cached --quiet
if errorlevel 1 (
  call git commit -m "GuestAtlas Cloudflare release %DATE% %TIME%" || goto :fail
)
call git pull --rebase origin main || goto :fail
call git push origin HEAD:main || goto :fail

echo [10/15] Authenticating Supabase CLI...
call npx supabase --version || goto :fail
if not defined SUPABASE_ACCESS_TOKEN (
  call npx supabase login || goto :fail
)
if not defined SUPABASE_PROJECT_REF (
  set /p SUPABASE_PROJECT_REF=Enter Supabase project ref: 
)
if not defined SUPABASE_PROJECT_REF (echo [ERROR] SUPABASE_PROJECT_REF is required. & goto :fail)

echo [11/15] Linking Supabase and applying database migrations...
call npx supabase link --project-ref "%SUPABASE_PROJECT_REF%" || goto :fail
call npx supabase db push || goto :fail

echo [12/15] Verifying deployed Postgres schema...
call npm run verify || goto :fail

echo [13/15] Preparing sanitized Worker secrets...
call node scripts/build-cloudflare-secrets.mjs .env.local || goto :fail

echo [14/15] Deploying GuestAtlas application Worker...
if defined CLOUDFLARE_CUSTOM_DOMAIN (
  echo Attaching Cloudflare custom domain: %CLOUDFLARE_CUSTOM_DOMAIN%
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" --domain "%CLOUDFLARE_CUSTOM_DOMAIN%" || goto :fail
) else (
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" || goto :fail
)

echo [15/15] Deploying Cloudflare scheduled maintenance Worker...
call npx wrangler deploy --config wrangler.maintenance.jsonc --secrets-file "%MAINT_SECRETS%" || goto :fail

if exist "%CF_SECRETS%" del /q "%CF_SECRETS%"
if exist "%MAINT_SECRETS%" del /q "%MAINT_SECRETS%"

echo.
echo =============================================================
echo GUESTATLAS DEPLOYMENT COMPLETE
echo =============================================================
echo Application runtime: Cloudflare Workers
echo Evidence storage:    private Cloudflare R2 / guestatlas-evidence
echo Scheduled retention: guestatlas-maintenance Worker, daily 02:15 UTC
echo Database and Auth:    Supabase Postgres + Auth behind the Worker
echo Source:               pushed to GitHub main after local validation
echo.
echo Required Supabase Auth setting:
echo   Site URL = %NEXT_PUBLIC_APP_URL%
echo   Redirect = %NEXT_PUBLIC_APP_URL%/auth/confirm
echo.
echo Health endpoint: %NEXT_PUBLIC_APP_URL%/api/health
echo =============================================================
pause
exit /b 0

:fail
if exist "%CF_SECRETS%" del /q "%CF_SECRETS%" >nul 2>&1
if exist "%MAINT_SECRETS%" del /q "%MAINT_SECRETS%" >nul 2>&1
echo.
echo =============================================================
echo [FAILED] GuestAtlas deployment stopped safely.
echo Nothing after the failed stage was executed.
echo Fix the error above and run GO-LIVE.cmd again.
echo =============================================================
pause
exit /b 1
