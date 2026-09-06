@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title GuestAtlas - Install, Push and Cloudflare Deploy

set "CF_SECRETS=.cloudflare.secrets.tmp.json"
set "MAINT_SECRETS=.maintenance.secrets.tmp.json"
set "TARGET_REPO=https://github.com/lionsgrandson/hotleBiz.git"

echo.
echo =============================================================
echo      GuestAtlas - FULL INSTALL + PUSH + CLOUDFLARE DEPLOY
echo =============================================================
echo.

call :ensure_prerequisites || goto :fail

rem Adopt the intended GitHub history even if the user started from an extracted ZIP.
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [GIT] Initializing this folder against lionsgrandson/hotleBiz...
  call git init || goto :fail
  call git remote add origin "%TARGET_REPO%" || goto :fail
  call git fetch origin main || goto :fail
  call git reset --mixed origin/main || goto :fail
  call git branch -M main || goto :fail
) else (
  for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "ORIGIN_URL=%%R"
  if not defined ORIGIN_URL (
    call git remote add origin "%TARGET_REPO%" || goto :fail
  ) else (
    echo !ORIGIN_URL! | findstr /I /C:"lionsgrandson/hotleBiz" >nul || (
      echo [ERROR] This folder's origin is not lionsgrandson/hotleBiz.
      echo Current origin: !ORIGIN_URL!
      goto :fail
    )
  )
)

rem Sync BEFORE testing. Autostash preserves tracked local edits while rebasing.
echo [0/18] Syncing GitHub main before validation...
call git pull --rebase --autostash origin main || goto :fail

if not exist .env.local (
  echo [SETUP] .env.local is missing. Starting configuration wizard...
  call configure.cmd || goto :fail
)
if not exist .env.local (echo [ERROR] Configuration did not create .env.local. & goto :fail)

for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
  if not "%%A"=="" if not "%%A:~0,1"=="#" set "%%A=%%B"
)

echo [1/18] Installing exact project dependencies...
if exist package-lock.json (
  call npm ci --no-audit --no-fund || goto :fail
) else (
  call npm install --no-audit --no-fund || goto :fail
)

echo [2/18] Checking production runtime dependencies for high/critical advisories...
call npm audit --omit=dev --audit-level=high || goto :fail

echo [3/18] Validating production environment and source integrity...
call node scripts/check-env.mjs --production || goto :fail
call npm run source-check || goto :fail

echo [4/18] Typechecking application...
call npm run typecheck || goto :fail

echo [5/18] Running scoring, encryption and matching self-tests...
call npm run self-test || goto :fail

echo [6/18] Preparing allow-listed Cloudflare runtime secrets...
call node scripts/build-cloudflare-secrets.mjs .env.local || goto :fail

echo [7/18] Authenticating Cloudflare Wrangler...
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

echo [8/18] Ensuring private R2 evidence bucket exists...
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul
if errorlevel 1 (
  call npx wrangler r2 bucket create guestatlas-evidence || goto :fail
)
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul || (echo [ERROR] guestatlas-evidence R2 bucket was not found after provisioning. & goto :fail)
del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1

echo [9/18] Building the Next.js application for Cloudflare Workers...
call npm run cf:build || goto :fail

echo [10/18] Dry-running the application Worker with production secret names...
if exist .cloudflare-dry-run rmdir /s /q .cloudflare-dry-run
call npx wrangler deploy --dry-run --secrets-file "%CF_SECRETS%" --outdir .cloudflare-dry-run || goto :fail

echo [11/18] Dry-running the scheduled maintenance Worker...
call npx wrangler deploy --config wrangler.maintenance.jsonc --dry-run --secrets-file "%MAINT_SECRETS%" || goto :fail

echo [12/18] Committing the exact source that passed validation...
call git add -A || goto :fail
call git diff --cached --quiet
if errorlevel 1 (
  call git commit -m "GuestAtlas Cloudflare release %DATE% %TIME%" || goto :fail
)

echo [13/18] Pushing validated source to GitHub main...
rem Deliberately DO NOT pull here. If main changed after validation, push must fail
rem so unvalidated remote code is never silently mixed into this release.
call git push origin HEAD:main || (
  echo [ERROR] GitHub main changed after this build was validated.
  echo Run GO-LIVE.cmd again so the new combined source is rebuilt before deployment.
  goto :fail
)

echo [14/18] Authenticating Supabase CLI...
call npx supabase --version || goto :fail
if not defined SUPABASE_ACCESS_TOKEN (
  call npx supabase login || goto :fail
)
if not defined SUPABASE_PROJECT_REF (
  set /p SUPABASE_PROJECT_REF=Enter Supabase project ref: 
)
if not defined SUPABASE_PROJECT_REF (echo [ERROR] SUPABASE_PROJECT_REF is required. & goto :fail)

echo [15/18] Linking Supabase and applying database migrations...
call npx supabase link --project-ref "%SUPABASE_PROJECT_REF%" || goto :fail
call npx supabase db push || goto :fail

echo [16/18] Verifying deployed Postgres schema...
call npm run verify || goto :fail

echo [17/18] Deploying GuestAtlas application Worker...
if defined CLOUDFLARE_CUSTOM_DOMAIN (
  echo Attaching Cloudflare custom domain: %CLOUDFLARE_CUSTOM_DOMAIN%
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" --domain "%CLOUDFLARE_CUSTOM_DOMAIN%" || goto :fail
) else (
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" || goto :fail
)

echo [18/18] Deploying Cloudflare scheduled maintenance Worker...
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
echo Source:               pushed to GitHub main after validation
echo.
echo Required Supabase Auth setting:
echo   Site URL = %NEXT_PUBLIC_APP_URL%
echo   Redirect = %NEXT_PUBLIC_APP_URL%/auth/confirm
echo.
echo Health endpoint: %NEXT_PUBLIC_APP_URL%/api/health
echo =============================================================
pause
exit /b 0

:ensure_prerequisites
where winget >nul 2>&1
set "HAS_WINGET=%ERRORLEVEL%"

where git >nul 2>&1
if errorlevel 1 (
  if not "%HAS_WINGET%"=="0" (
    echo [ERROR] Git is missing and winget is unavailable. Install Git for Windows and rerun.
    exit /b 1
  )
  echo [SETUP] Installing Git for Windows...
  winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements || exit /b 1
  call :refresh_path
)

where node >nul 2>&1
if errorlevel 1 (
  if not "%HAS_WINGET%"=="0" (
    echo [ERROR] Node.js is missing and winget is unavailable. Install Node.js 22+ and rerun.
    exit /b 1
  )
  echo [SETUP] Installing current Node.js LTS...
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements || exit /b 1
  call :refresh_path
)

node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>&1
if errorlevel 1 (
  if not "%HAS_WINGET%"=="0" (
    echo [ERROR] Node.js 22+ is required. Upgrade Node.js and rerun.
    exit /b 1
  )
  echo [SETUP] Upgrading Node.js to current LTS...
  winget upgrade --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements || exit /b 1
  call :refresh_path
)

where npm >nul 2>&1 || (echo [ERROR] npm was not found after Node.js setup. Reopen the terminal and rerun GO-LIVE.cmd. & exit /b 1)
where git >nul 2>&1 || (echo [ERROR] Git was not found after setup. Reopen the terminal and rerun GO-LIVE.cmd. & exit /b 1)
exit /b 0

:refresh_path
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%P"
exit /b 0

:fail
if exist "%CF_SECRETS%" del /q "%CF_SECRETS%" >nul 2>&1
if exist "%MAINT_SECRETS%" del /q "%MAINT_SECRETS%" >nul 2>&1
if exist "%TEMP%\guestatlas-r2.txt" del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1
echo.
echo =============================================================
echo [FAILED] GuestAtlas deployment stopped safely.
echo Nothing after the failed stage was executed.
echo Fix the error above and run GO-LIVE.cmd again.
echo =============================================================
pause
exit /b 1
