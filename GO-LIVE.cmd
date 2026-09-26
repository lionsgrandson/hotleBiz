@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title GuestAtlas - Direct Production Deploy

set "CF_SECRETS=.cloudflare.secrets.tmp.json"
set "MAINT_SECRETS=.maintenance.secrets.tmp.json"

echo.
echo =============================================================
echo      GuestAtlas - DIRECT PRODUCTION DEPLOY
echo      Local machine ^> Supabase + Cloudflare
echo      No GitHub Actions, pull, commit, or push
echo =============================================================
echo.

call :ensure_prerequisites || goto :fail

if not exist .env.local (
  echo [SETUP] .env.local is missing. Starting configuration wizard...
  call configure.cmd || goto :fail
)
if not exist .env.local (echo [ERROR] Configuration did not create .env.local. & goto :fail)

rem GuestAtlas currently has a fixed production workers.dev origin.
call node scripts\pin-production-url.mjs ".env.local" || goto :fail
call :load_env || goto :fail

if not defined NEXT_PUBLIC_LEGAL_NAME goto :complete_config
if not defined NEXT_PUBLIC_PRIVACY_EMAIL goto :complete_config
if not defined NEXT_PUBLIC_SECURITY_EMAIL goto :complete_config
if not defined NEXT_PUBLIC_ACCESSIBILITY_EMAIL goto :complete_config
goto :config_ready

:complete_config
echo [SETUP] Production operator/contact fields are incomplete.
echo [SETUP] Opening configuration wizard so public legal/security pages are not launched with placeholders...
call configure.cmd || goto :fail
call node scripts\pin-production-url.mjs ".env.local" || goto :fail
call :load_env || goto :fail

:config_ready
echo [1/17] Installing exact project dependencies...
if exist package-lock.json (
  call npm ci --no-audit --no-fund || goto :fail
) else (
  echo [ERROR] package-lock.json is required for a reproducible production release.
  goto :fail
)

echo [2/17] Checking production runtime dependencies for high/critical advisories...
call npm audit --omit=dev --audit-level=high || goto :fail

echo [3/17] Validating production environment and source integrity...
call node scripts/check-env.mjs --production || goto :fail
call npm run source-check || goto :fail

echo [4/17] Typechecking application...
call npm run typecheck || goto :fail

echo [5/17] Running scoring, encryption and matching self-tests...
call npm run self-test || goto :fail

echo [6/17] Preparing allow-listed Cloudflare runtime environment...
call node scripts/build-cloudflare-secrets.mjs .env.local || goto :fail

echo [7/17] Authenticating Cloudflare Wrangler...
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

echo [8/17] Ensuring private R2 evidence bucket exists...
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul
if errorlevel 1 (
  call npx wrangler r2 bucket create guestatlas-evidence --experimental-provision=false --experimental-auto-create=false || goto :fail
)
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul || (echo [ERROR] guestatlas-evidence R2 bucket was not found after provisioning. & goto :fail)
del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1

echo [9/17] Building the Next.js application for Cloudflare Workers...
call npm run cf:build || goto :fail

echo [10/17] Dry-running the application Worker...
if exist .cloudflare-dry-run rmdir /s /q .cloudflare-dry-run
call npx wrangler deploy --dry-run --secrets-file "%CF_SECRETS%" --outdir .cloudflare-dry-run || goto :fail

echo [11/17] Dry-running the scheduled maintenance Worker...
call npx wrangler deploy --config wrangler.maintenance.jsonc --dry-run --secrets-file "%MAINT_SECRETS%" || goto :fail

echo [12/17] Authenticating Supabase CLI...
call npx supabase --version || goto :fail
if not defined SUPABASE_ACCESS_TOKEN (
  call :repair_supabase_profile || goto :fail
  call npx supabase login || goto :fail
)
if not defined SUPABASE_PROJECT_REF (
  set /p SUPABASE_PROJECT_REF=Enter Supabase project ref:
)
if not defined SUPABASE_PROJECT_REF (echo [ERROR] SUPABASE_PROJECT_REF is required. & goto :fail)

echo [13/17] Linking existing Supabase project and applying Postgres migrations...
call npx supabase link --project-ref "%SUPABASE_PROJECT_REF%" || goto :fail
rem Do NOT run "supabase config push" here. Hosted Auth settings are verified
rem manually because config push can synchronize unrelated optional services.
call npx supabase db push || goto :fail

echo [14/17] Verifying deployed Postgres schema...
call npm run verify || goto :fail

echo [15/17] Deploying GuestAtlas application Worker...
if defined CLOUDFLARE_CUSTOM_DOMAIN (
  echo Attaching Cloudflare custom domain: %CLOUDFLARE_CUSTOM_DOMAIN%
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" --domain "%CLOUDFLARE_CUSTOM_DOMAIN%" || goto :fail
) else (
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" || goto :fail
)

echo [16/17] Deploying Cloudflare scheduled maintenance Worker...
call npx wrangler deploy --config wrangler.maintenance.jsonc --secrets-file "%MAINT_SECRETS%" || goto :fail

echo [17/17] Running production health smoke check...
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $r=Invoke-RestMethod -Uri ($env:NEXT_PUBLIC_APP_URL + '/api/health') -TimeoutSec 30; if(-not $r.ok){throw 'Health endpoint returned an unhealthy response'}" || goto :fail

if exist "%CF_SECRETS%" del /q "%CF_SECRETS%" >nul 2>&1
if exist "%MAINT_SECRETS%" del /q "%MAINT_SECRETS%" >nul 2>&1
if exist .cloudflare-dry-run rmdir /s /q .cloudflare-dry-run >nul 2>&1

echo.
echo =============================================================
echo GUESTATLAS DEPLOYMENT COMPLETE
echo =============================================================
echo Application URL:        %NEXT_PUBLIC_APP_URL%
echo Application runtime:    Cloudflare Workers
echo Evidence storage:       private Cloudflare R2 / guestatlas-evidence
echo Scheduled retention:    guestatlas-maintenance Worker, daily 02:15 UTC
echo Database and Auth:       existing Supabase Postgres + Auth
echo GitHub deployment:       NOT USED
echo Git source changes:      NOT TOUCHED by this deploy script
echo Supabase config push:    SKIPPED intentionally
echo.
echo Verify these Supabase Auth settings in the Dashboard:
echo   Site URL = %NEXT_PUBLIC_APP_URL%
echo   Redirect = %NEXT_PUBLIC_APP_URL%/auth/confirm
echo   Redirect = %NEXT_PUBLIC_APP_URL%/auth/recovery
echo   TOTP MFA enrollment and verification = enabled
echo   Confirm email = enabled
echo   Secure password change = enabled
echo.
echo Public site:      %NEXT_PUBLIC_APP_URL%/
echo Hotel dashboard: %NEXT_PUBLIC_APP_URL%/dashboard
echo Platform admin:  %NEXT_PUBLIC_APP_URL%/platform
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
for %%V in (NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY PII_ENCRYPTION_KEY MATCHING_SECRET AUDIT_HASH_SECRET NEXT_PUBLIC_APP_URL GUESTATLAS_URL_MODE NEXT_PUBLIC_LEGAL_NAME NEXT_PUBLIC_PRIVACY_EMAIL NEXT_PUBLIC_SECURITY_EMAIL NEXT_PUBLIC_ACCESSIBILITY_EMAIL NEXT_PUBLIC_DPO_EMAIL NEXT_PUBLIC_LEGAL_ADDRESS NEXT_PUBLIC_LEGAL_COUNTRY RESEND_API_KEY EMAIL_FROM PLATFORM_ADMIN_EMAILS REQUIRE_MFA SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN CLOUDFLARE_CUSTOM_DOMAIN CRON_SECRET) do set "%%V="
for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
  if not "%%A"=="" if not "%%A:~0,1"=="#" set "%%A=%%B"
)
exit /b 0

:ensure_prerequisites
where winget >nul 2>&1
set "HAS_WINGET=%ERRORLEVEL%"

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
