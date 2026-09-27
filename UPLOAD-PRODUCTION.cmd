@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title GuestAtlas - Local Production Upload

set "CF_SECRETS=.cloudflare.secrets.tmp.json"
set "MAINT_SECRETS=.maintenance.secrets.tmp.json"

echo.
echo =============================================================
echo      GuestAtlas - VALIDATE + MIGRATE + DEPLOY
echo      Local CMD deployment. No GitHub Actions required.
echo =============================================================
echo.

call :ensure_node || goto :fail

if not exist .env.local (
  echo [SETUP] .env.local is missing. Starting configuration wizard...
  call configure.cmd || goto :fail
)
if not exist .env.local (echo [ERROR] Configuration did not create .env.local. & goto :fail)

call node scripts\pin-production-url.mjs ".env.local" || goto :fail
call :load_env || goto :fail

echo [1/14] Installing exact dependencies...
call npm ci --no-audit --no-fund || goto :fail

echo [2/14] Runtime dependency security gate...
call npm audit --omit=dev --audit-level=high || goto :fail

echo [3/14] Validating production environment and source...
call node scripts/check-env.mjs --production || goto :fail
call npm run source-check || goto :fail

echo [4/14] TypeScript validation...
call npm run typecheck || goto :fail

echo [5/14] Application self-tests...
call npm run self-test || goto :fail

echo [6/14] Preparing Cloudflare secret bundles...
call node scripts/build-cloudflare-secrets.mjs .env.local || goto :fail

echo [7/14] Authenticating Cloudflare...
call npx wrangler whoami >nul 2>&1
if errorlevel 1 (
  if defined CLOUDFLARE_API_TOKEN (
    echo [ERROR] CLOUDFLARE_API_TOKEN is set but Wrangler authentication failed.
    goto :fail
  )
  call npx wrangler login || goto :fail
)

echo [8/14] Ensuring private evidence bucket exists...
call npx wrangler r2 bucket list > "%TEMP%\guestatlas-r2.txt" || goto :fail
findstr /I /C:"guestatlas-evidence" "%TEMP%\guestatlas-r2.txt" >nul
if errorlevel 1 (
  call npx wrangler r2 bucket create guestatlas-evidence --experimental-provision=false --experimental-auto-create=false || goto :fail
)
del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1

echo [9/14] Building Cloudflare bundle...
call npm run cf:build || goto :fail

echo [10/14] Dry-run validation...
if exist .cloudflare-dry-run rmdir /s /q .cloudflare-dry-run
call npx wrangler deploy --dry-run --secrets-file "%CF_SECRETS%" --outdir .cloudflare-dry-run || goto :fail
call npx wrangler deploy --config wrangler.maintenance.jsonc --dry-run --secrets-file "%MAINT_SECRETS%" || goto :fail

echo [11/14] Linking existing Supabase project...
call npx supabase --version || goto :fail
if not defined SUPABASE_ACCESS_TOKEN call npx supabase login || goto :fail
if not defined SUPABASE_PROJECT_REF set /p SUPABASE_PROJECT_REF=Enter Supabase project ref:
if not defined SUPABASE_PROJECT_REF (echo [ERROR] SUPABASE_PROJECT_REF is required. & goto :fail)
call npx supabase link --project-ref "%SUPABASE_PROJECT_REF%" || goto :fail

echo [12/14] Applying database migrations and verifying schema...
call npx supabase db push || goto :fail
call npm run verify || goto :fail

echo [13/14] Deploying application Worker...
if defined CLOUDFLARE_CUSTOM_DOMAIN (
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" --domain "%CLOUDFLARE_CUSTOM_DOMAIN%" || goto :fail
) else (
  call npx opennextjs-cloudflare deploy --secrets-file "%CF_SECRETS%" || goto :fail
)

echo [14/14] Deploying maintenance Worker...
call npx wrangler deploy --config wrangler.maintenance.jsonc --secrets-file "%MAINT_SECRETS%" || goto :fail

call :cleanup
echo.
echo =============================================================
echo GUESTATLAS PRODUCTION UPLOAD COMPLETE
echo =============================================================
echo URL:              %NEXT_PUBLIC_APP_URL%
echo Admin:            %NEXT_PUBLIC_APP_URL%/platform
echo Hotel dashboard:  %NEXT_PUBLIC_APP_URL%/dashboard
echo Privacy center:   %NEXT_PUBLIC_APP_URL%/privacy-center
echo Guest rights:     %NEXT_PUBLIC_APP_URL%/guest-rights
echo Health:           %NEXT_PUBLIC_APP_URL%/api/health
echo.
echo IMPORTANT: This deploys code and database migrations only.
echo Counsel/operator sign-off items in PRODUCTION_READINESS.md remain manual.
echo =============================================================
pause
exit /b 0

:load_env
for %%V in (NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY PII_ENCRYPTION_KEY MATCHING_SECRET AUDIT_HASH_SECRET NEXT_PUBLIC_APP_URL GUESTATLAS_URL_MODE RESEND_API_KEY EMAIL_FROM PLATFORM_ADMIN_EMAILS REQUIRE_MFA SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN CLOUDFLARE_CUSTOM_DOMAIN CRON_SECRET PRIVACY_CONTACT_EMAIL SUPPORT_EMAIL OPERATOR_LEGAL_NAME) do set "%%V="
for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
  if not "%%A"=="" if not "%%A:~0,1"=="#" set "%%A=%%B"
)
exit /b 0

:ensure_node
where node >nul 2>&1 || (echo [ERROR] Node.js 22+ is required. & exit /b 1)
where npm >nul 2>&1 || (echo [ERROR] npm is required. & exit /b 1)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>&1 || (echo [ERROR] Node.js 22+ is required. & exit /b 1)
exit /b 0

:cleanup
if exist "%CF_SECRETS%" del /q "%CF_SECRETS%" >nul 2>&1
if exist "%MAINT_SECRETS%" del /q "%MAINT_SECRETS%" >nul 2>&1
if exist "%TEMP%\guestatlas-r2.txt" del /q "%TEMP%\guestatlas-r2.txt" >nul 2>&1
exit /b 0

:fail
call :cleanup
echo.
echo [FAILED] Deployment stopped before later stages were executed.
echo Fix the error above and run UPLOAD-PRODUCTION.cmd again.
pause
exit /b 1
