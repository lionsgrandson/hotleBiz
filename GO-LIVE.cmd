@echo off
setlocal
cd /d "%~dp0"
echo GuestAtlas GO-LIVE now uses the local validated upload path.
echo No GitHub Actions or GitHub-hosted deployment runner is required.
call UPLOAD-PRODUCTION.cmd
exit /b %ERRORLEVEL%
