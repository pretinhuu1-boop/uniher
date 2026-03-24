@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
title UniHER - Watchdog

if not exist data mkdir data

:loop
echo [%date% %time%] Iniciando servidor UniHER... >> data\server.log
echo [WATCHDOG] Iniciando servidor UniHER...
echo.

npm run dev -- --port 3000

set EXIT_CODE=%ERRORLEVEL%
echo [%date% %time%] Servidor encerrou (codigo: %EXIT_CODE%) >> data\server.log
echo.
echo [WATCHDOG] Servidor encerrou (codigo: %EXIT_CODE%).
echo [WATCHDOG] Reiniciando em 3 segundos...
echo.
timeout /t 3 /nobreak >nul
goto loop
