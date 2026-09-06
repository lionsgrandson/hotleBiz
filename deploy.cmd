@echo off
setlocal
cd /d "%~dp0"
call GO-LIVE.cmd
exit /b %ERRORLEVEL%
