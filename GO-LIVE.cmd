@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title GuestAtlas - Install, Push and Cloudflare Deploy

set "CF_SECRETS=.cloudflare.secrets.tmp.json"
set "MAINT_SECRETS=.maintenance.secrets.tmp.json"
set "DEPLOY_LOG=.guestatlas-first-deploy.log"
set "TARGET_REPO=https://github.com/lionsgrandson/hotleBiz.git"

echo.
echo =============================================================
echo      GuestAtlas - FULL INSTALL + PUSH + CLOUDFLARE DEPLOY
echo =============================================================
echo.

call :ensure_prerequisites || goto :fail

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

echo [0/21] Syncing GitHub main before validation...
call git pull --rebase --autostash origin main || goto :fail

if not exist .env.local (
  echo [SETUP] .env.local is missing. Starting configuration wizard...
  call configure.cmd || goto :fail
)
if not exist .env.local (echo [ERROR] Configuration did not create .env.local. & goto :fail)

rem GuestAtlas now has a permanent production workers.dev URL. Keep the local
rem environment pinned to it so Auth, invite links, guest portal links and Cron
rem calls never fall back to localhost or the old bootstrap origin.
call node scripts\pin-production-url.mjs ".env.local" || goto :fail
call :load_env || goto :fail

set "AUTO_WORKERS_DEV=0"
if /I "%GUESTATLAS_URL_MODE%"=="workers_dev_auto" set "AUTO_WORKERS_DEV=1"
if "%AUTO_WORKERS_DEV%"=="1" (
  echo [URL] No production URL supplied. Cloudflare workers.dev will be discovered automatically.
)

echo [1/21] Installing exact project dependencies...
if exist package-lock.json (
  call npm ci --no-audit --no-fund || goto :fail
) else (
  call npm install --no-audit --no-fund || goto :fail
)

echo [2/21] Checking production runtime dependencies for high/critical advisories...
call npm audit --omit=dev --audit-level=high || goto :fail

echo [3/21] Validating production environment and source integrity...
call node scripts/check-env.mjs --production || goto :fail
call npm run source-check || goto :fail

echo [4/21] Typechecking application...
call npm run typecheck || goto :fail

echo [5/21] Running scoring, encryption and matching self-tests...
call npm run self-test || goto :fail

echo [6/21] Preparing allow-listed Cloudflare runtime secrets...
call node scripts/build-cloudflare-secrets.mjs .env.local || goto :fail

echo [7/21] Authenticating Cloudflare Wrangler...
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

echo [8/21] Ensuring private R2 evidence bucket exists...
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul
if errorlevel 1 (
  rem Disable Wrangler's experimental auto-provisioning here. The EVIDENCE_BUCKET
  rem binding is already committed in wrangler.jsonc and must not be duplicated.
  call npx wrangler r2 bucket create guestatlas-evidence --experimental-provision=false --experimental-auto-create=false || goto :fail
)
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul || (echo [ERROR] guestatlas-evidence R2 bucket was not found after provisioning. & goto :fail)
del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1

echo [9/21] Building the Next.js application for Cloudflare Workers...
call npm run cf:build || goto :fail

echo [10/21] Dry-running the application Worker with production secret names...
if exist .cloudflare-dry-run rmdir /s /q .cloudflare-dry-run
call npx wrangler deploy --dry-run --secrets-file "%CF_SECRETS%" --outdir .cloudflare-dry-run || goto :fail

echo [11/21] Dry-running the scheduled maintenance Worker...
call npx wrangler deploy --config wrangler.maintenance.jsonc --dry-run --secrets-file "%MAINT_SECRETS%" || goto :fail

echo [12/21] Committing the exact source that passed validation...
call git add -A || goto :fail
call git diff --cached --quiet
if errorlevel 1 (
  call git commit -m "GuestAtlas Cloudflare release %DATE% %TIME%" || goto :fail
)

echo [13/21] Pushing validated source to GitHub main...
call git push origin HEAD:main || (
  echo [ERROR] GitHub main changed after this build was validated.
  echo Run GO-LIVE.cmd again so the new combined source is rebuilt before deployment.
  goto :fail
)

echo [14/21] Authenticating Supabase CLI...
call npx supabase --version || goto :fail
if not defined SUPABASE_ACCESS_TOKEN (
  call :repair_supabase_profile || goto :fail
  call npx supabase login || goto :fail
)
if not defined SUPABASE_PROJECT_REF (
  set /p SUPABASE_PROJECT_REF=Enter Supabase project ref: 
)
if not defined SUPABASE_PROJECT_REF (echo [ERROR] SUPABASE_PROJECT_REF is required. & goto :fail)

echo [15/21] Linking Supabase, syncing hosted Auth config, and applying migrations...
call npx supabase link --project-ref "%SUPABASE_PROJECT_REF%" || goto :fail
call npx supabase config push || goto :fail
call npx supabase db push || goto :fail

echo [16/21] Verifying deployed Postgres schema...
call npm run verify || goto :fail

if "%AUTO_WORKERS_DEV%"=="1" (
  echo [17/21] First Cloudflare deploy: discovering the assigned workers.dev URL...
  if exist "%DEPLOY_LOG%" del /q "%DEPLOY_LOG%" >nul 2>&1
  call node scripts\deploy-and-capture.mjs "%CF_SECRETS%" "%DEPLOY_LOG%" || goto :fail

  for /f "usebackq delims=" %%U in (`node scripts\finalize-workers-url.mjs "%DEPLOY_LOG%" ".env.local"`) do set "DISCOVERED_URL=%%U"
  if errorlevel 1 goto :fail
  if not defined DISCOVERED_URL (echo [ERROR] Automatic workers.dev URL discovery returned no URL. & goto :fail)
  echo [URL] Cloudflare assigned: !DISCOVERED_URL!

  call :load_env || goto :fail
  set "AUTO_WORKERS_DEV=0"

  echo [18/21] Rebuilding with the real public URL...
  call node scripts/check-env.mjs --production || goto :fail
  call node scripts/build-cloudflare-secrets.mjs .env.local || goto :fail
  call npm run cf:build || goto :fail

  echo [19/21] Validating the final Worker bundle...
  if exist .cloudflare-dry-run rmdir /s /q .cloudflare-dry-run
  call npx wrangler deploy --dry-run --secrets-file "%CF_SECRETS%" --outdir .cloudflare-dry-run || goto :fail

  echo [20/21] Deploying final GuestAtlas Worker with resolved workers.dev URL...
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" || goto :fail
) else (
  echo [17/21] Production URL already resolved. No bootstrap deploy required.
  echo [18/21] Final environment already validated.
  echo [19/21] Final Worker bundle already dry-run validated.
  echo [20/21] Deploying GuestAtlas application Worker...
  if defined CLOUDFLARE_CUSTOM_DOMAIN (
    echo Attaching Cloudflare custom domain: %CLOUDFLARE_CUSTOM_DOMAIN%
    call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" --domain "%CLOUDFLARE_CUSTOM_DOMAIN%" || goto :fail
  ) else (
    call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" || goto :fail
  )
)

echo [21/21] Deploying Cloudflare scheduled maintenance Worker...
call npx wrangler deploy --config wrangler.maintenance.jsonc --secrets-file "%MAINT_SECRETS%" || goto :fail

if exist "%CF_SECRETS%" del /q "%CF_SECRETS%"
if exist "%MAINT_SECRETS%" del /q "%MAINT_SECRETS%"
if exist "%DEPLOY_LOG%" del /q "%DEPLOY_LOG%" >nul 2>&1

echo.
echo =============================================================
echo GUESTATLAS DEPLOYMENT COMPLETE
echo =============================================================
echo Application URL:        %NEXT_PUBLIC_APP_URL%
echo Application runtime:    Cloudflare Workers
echo Evidence storage:       private Cloudflare R2 / guestatlas-evidence
echo Scheduled retention:    guestatlas-maintenance Worker, daily 02:15 UTC
echo Database and Auth:       Supabase Postgres + Auth behind the Worker
echo Source:                  pushed to GitHub main after validation
echo.
echo Supabase Auth synced from supabase/config.toml:
echo   Site URL = %NEXT_PUBLIC_APP_URL%
echo   Redirect = %NEXT_PUBLIC_APP_URL%/auth/confirm
echo.
echo Platform admin: %NEXT_PUBLIC_APP_URL%/platform
echo Hotel dashboard: %NEXT_PUBLIC_APP_URL%/dashboard
echo Guest rights:    %NEXT_PUBLIC_APP_URL%/guest-rights
echo Health endpoint: %NEXT_PUBLIC_APP_URL%/api/health
echo =============================================================
pause
exit /b 0

:repair_supabase_profile
set "SUPABASE_LEGACY_PROFILE=%USERPROFILE%\.supabase\profile"
if exist "%SUPABASE_LEGACY_PROFILE%" (
  set "SUPABASE_PROFILE_BACKUP=%USERPROFILE%\.supabase\profile.guestatlas-backup-%RANDOM%"
  echo [SUPABASE] Found a legacy CLI profile file that can break current Supabase CLI on Windows.
  echo [SUPABASE] Backing it up before login...
  move /Y "%SUPABASE_LEGACY_PROFILE%" "!SUPABASE_PROFILE_BACKUP!" >nul || exit /b 1
  echo [SUPABASE] Legacy profile backed up safely.
)
exit /b 0

:load_env
for %%V in (NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY PII_ENCRYPTION_KEY MATCHING_SECRET AUDIT_HASH_SECRET NEXT_PUBLIC_APP_URL GUESTATLAS_URL_MODE RESEND_API_KEY EMAIL_FROM PLATFORM_ADMIN_EMAILS REQUIRE_MFA SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN CLOUDFLARE_CUSTOM_DOMAIN CRON_SECRET) do set "%%V="
for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
  if not "%%A"=="" if not "%%A:~0,1"=="#" set "%%A=%%B"
)
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
if exist "%DEPLOY_LOG%" del /q "%DEPLOY_LOG%" >nul 2>&1
if exist "%TEMP%\guestatlas-r2.txt" del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1
echo.
echo =============================================================
echo [FAILED] GuestAtlas deployment stopped safely.
echo Nothing after the failed stage was executed.
echo Fix the error above and run GO-LIVE.cmd again.
echo =============================================================
pause
exit /b 1
