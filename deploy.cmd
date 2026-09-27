@echo off
setlocal
cd /d "%~dp0"
call UPLOAD-PRODUCTION.cmd
exit /b %ERRORLEVEL%
